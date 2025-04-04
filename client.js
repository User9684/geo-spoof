// client.js - User9684

// This JavaScript file is injected into all pages to modify geolocation
// functionality, resulting in spoofed geolocation.

(() => {
    const events = [];
    const watchers = new Map();
    let watcherIdCounter = 0;

    async function generateFakeCoords(config) {
        const coords = {
            latitude: config.latitude,
            longitude: config.longitude,
            accuracy: config.accuracy,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
        };

        Object.setPrototypeOf(coords, GeolocationCoordinates.prototype);

        return coords;
    }

    async function generateFakePosition(config) {
        const coords = await generateFakeCoords(config);

        const position = {
            coords: coords,
            timestamp: Date.now(),
        };

        Object.setPrototypeOf(position, GeolocationPosition.prototype);

        return position;
    }

    function generateSpoofedFunction(originalFunction, newFunction) {
        function spoofedFunction(...args) {
          return newFunction(...args);
        }
    
        Object.setPrototypeOf(
          spoofedFunction,
          Object.getPrototypeOf(originalFunction)
        );
    
        Object.defineProperty(spoofedFunction, "toString", {
          value: originalFunction.toString.bind(originalFunction),
          writable: true,
          configurable: true,
        });
    
        return spoofedFunction;
    }

    window.navigator.geolocation.getCurrentPosition = generateSpoofedFunction(
        window.navigator.geolocation.getCurrentPosition,
        function (success, fail) {
            const newEvent = new CustomEvent("gs-request-cpos");
            events[newEvent] = success;

            document.documentElement.dispatchEvent(newEvent);
        }
    );

    window.navigator.geolocation.watchPosition = generateSpoofedFunction(
        window.navigator.geolocation.watchPosition,
        function (success, fail) {
            const watcherId = ++watcherIdCounter;

            const newEvent = new CustomEvent("gs-request-watchpos");
            watchers.set(watcherId, success);

            document.documentElement.dispatchEvent(newEvent);

            return watcherId;
        }
    );

    window.navigator.geolocation.clearWatch = generateSpoofedFunction(
        window.navigator.geolocation.clearWatch,
        function (watcherId) {
            if (watchers.has(watcherId)) {
                watchers.delete(watcherId);
            }
        }
    );

    document.documentElement.addEventListener("gs-response-cpos", async (e) => {
        const generatedPosition = await generateFakePosition(e.detail);
        events[e](generatedPosition);
    });

    document.documentElement.addEventListener(
        "gs-response-watchpos",
        async (e) => {
            const { watcherId, detail } = e.detail;

            if (watchers.has(watcherId)) {
                const generatedPosition = await generateFakePosition(detail);
                watchers.get(watcherId)(generatedPosition);
            }
        }
    );
})();
