// client.js - User9684

// This JavaScript file is injected into all pages to modify geolocation
// functionality, resulting in spoofed geolocation.

(() => {
    const events = new Map();
    const watchers = new Map();
    let watcherIdCounter = 0;
    let requestIdCounter = 0;
    let validationIdCounter = 0;
    let permissionRequestIdCounter = 0;
    const nativeFunctionToString = Function.prototype.toString;

    function recursiveNativeToString() {
        return "function toString() { [native code] }";
    }

    Object.defineProperty(recursiveNativeToString, "toString", {
        value: recursiveNativeToString,
        writable: false,
        configurable: false,
    });

    function createNativeLikeObject(prototype, properties) {
        const target = Object.create(prototype);
        const propertyNames = Object.keys(properties);

        Object.defineProperties(
            target,
            Object.fromEntries(
                propertyNames.map((name) => [
                    name,
                    {
                        value: properties[name],
                        enumerable: false,
                        writable: false,
                        configurable: true,
                    },
                ])
            )
        );

        return new Proxy(target, {
            ownKeys() {
                return [];
            },
            getOwnPropertyDescriptor(object, name) {
                if (propertyNames.includes(name)) {
                    return undefined;
                }

                return Reflect.getOwnPropertyDescriptor(object, name);
            },
        });
    }

    async function generateFakeCoords(config) {
        return createNativeLikeObject(GeolocationCoordinates.prototype, {
            latitude: config.latitude,
            longitude: config.longitude,
            accuracy: config.accuracy,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
        });
    }

    async function generateFakePosition(config) {
        const coords = await generateFakeCoords(config);

        return createNativeLikeObject(GeolocationPosition.prototype, {
            coords,
            timestamp: Date.now(),
        });
    }

    function createPermissionStatus(state) {
        const target = Object.create(PermissionStatus.prototype);

        Object.defineProperties(target, {
            state: {
                value: state,
                enumerable: false,
                writable: false,
                configurable: true,
            },
            onchange: {
                value: null,
                enumerable: true,
                writable: true,
                configurable: true,
            },
        });

        return target;
    }

    function getSpoofedPermissionState() {
        const permissionRequestId = ++permissionRequestIdCounter;

        return new Promise((resolve) => {
            const listener = (event) => {
                if (
                    !event.detail ||
                    event.detail.permissionRequestId !== permissionRequestId
                ) {
                    return;
                }

                document.documentElement.removeEventListener(
                    "gs-permission-response",
                    listener
                );
                resolve(createPermissionStatus(event.detail.state));
            };

            document.documentElement.addEventListener(
                "gs-permission-response",
                listener
            );
            document.documentElement.dispatchEvent(
                new CustomEvent("gs-permission-request", {
                    detail: { permissionRequestId },
                })
            );
        });
    }

    function executeWithNativeArity(receiver, originalFunction, args) {
        switch (args.length) {
            case 0:
                return originalFunction.call(receiver);
            case 1:
                return originalFunction.call(receiver, args[0]);
            case 2:
                return originalFunction.call(
                    receiver,
                    args[0],
                    args[1]
                );
            default:
                return originalFunction.call(
                    receiver,
                    args[0],
                    args[1],
                    args[2]
                );
        }
    }

    function validateNativeArguments(method, originalFunction, args) {
        const validationId = ++validationIdCounter;
        const callerStack = new Error().stack;
        let validationError;
        const validationArgs = args.map((argument) =>
            typeof argument === "function"
                ? { __geospoofFunction: true }
                : argument
        );

        const listener = (event) => {
            if (!event.detail || event.detail.validationId !== validationId) {
                return;
            }

            validationError = event.detail.error;
        };

        document.documentElement.addEventListener(
            "gs-validation-response",
            listener,
            { once: true }
        );
        document.documentElement.dispatchEvent(
            new CustomEvent("gs-validation-request", {
                detail: { validationId, method, args: validationArgs },
            })
        );

        if (validationError) {
            let error;

            try {
                executeWithNativeArity(navigator.geolocation, originalFunction, args);
            } catch (nativeError) {
                error = nativeError;
            }

            if (!error) {
                error = new Error(validationError.message);
                error.name = validationError.name;
            }

            error.message = error.message.replace(
                /^Failed to execute '[^']+' on '[^']+': /,
                ""
            );

            if (callerStack) {
                const callSite = callerStack
                    .split("\n")
                    .slice(1)
                    .filter((line) => !line.includes("client.js"))
                    .join("\n");
                error.stack = `${error.name}: ${error.message}\n${callSite}`;
            }

            throw error;
        }
    }

    function generateSpoofedFunction(originalFunction, newFunction, numArgs = 0) {
        function spoofedFunction(...args) {
            return newFunction(...args);
        }

        function spoofedToString() {
            return nativeFunctionToString.call(originalFunction);
        }

        Object.defineProperty(spoofedToString, "toString", {
            value: recursiveNativeToString,
            writable: false,
            configurable: false,
        });

        Object.defineProperty(spoofedFunction, "toString", {
            value: spoofedToString,
            writable: true,
            configurable: true,
        });

        for (const property of ["name", "length"]) {
            const descriptor = Object.getOwnPropertyDescriptor(
                originalFunction,
                property
            );

            if (descriptor) {
                Object.defineProperty(spoofedFunction, property, descriptor);
            }
        }

        return spoofedFunction;
    }

    const originalGetCurrentPosition =
        window.navigator.geolocation.getCurrentPosition;
    const originalWatchPosition = window.navigator.geolocation.watchPosition;
    const originalClearWatch = window.navigator.geolocation.clearWatch;
    const originalPermissionsQuery = window.navigator.permissions.query;

    window.navigator.geolocation.getCurrentPosition = generateSpoofedFunction(
        originalGetCurrentPosition,
        function (...args) {
            validateNativeArguments(
                "getCurrentPosition",
                originalGetCurrentPosition,
                args
            );

            const [success, fail, options] = args;

            const requestId = ++requestIdCounter;
            const newEvent = new CustomEvent("gs-request-cpos", {
                detail: { requestId, options },
            });
            const callbacks = { success, fail, timer: null };

            if (Number.isFinite(options?.timeout) && options.timeout > 0) {
                callbacks.timer = setTimeout(() => {
                    if (events.delete(requestId) && fail) {
                        fail({ code: 3, message: "Timeout expired" });
                    }
                }, options.timeout);
            }

            events.set(requestId, callbacks);

            document.documentElement.dispatchEvent(newEvent);
        }
    );

    window.navigator.geolocation.watchPosition = generateSpoofedFunction(
        originalWatchPosition,
        function (...args) {
            validateNativeArguments("watchPosition", originalWatchPosition, args);

            const [success, fail, options] = args;

            const watcherId = ++watcherIdCounter;

            const newEvent = new CustomEvent("gs-request-watchpos", {
                detail: { watcherId, options },
            });
            watchers.set(watcherId, { success, fail });

            document.documentElement.dispatchEvent(newEvent);

            return watcherId;
        }
    );

    window.navigator.geolocation.clearWatch = generateSpoofedFunction(
        originalClearWatch,
        function (watcherId) {
            if (watchers.has(watcherId)) {
                watchers.delete(watcherId);
            }
        }
    );

    window.navigator.permissions.query = generateSpoofedFunction(
        originalPermissionsQuery,
        function (...args) {
            executeWithNativeArity(
                navigator.permissions,
                originalPermissionsQuery,
                args
            );

            if (args[0]?.name !== "geolocation") {
                return executeWithNativeArity(
                    navigator.permissions,
                    originalPermissionsQuery,
                    args
                );
            }

            return getSpoofedPermissionState();
        }
    );

    document.documentElement.addEventListener("gs-response-cpos", async (e) => {
        const { requestId, detail, error } = e.detail;
        const callbacks = events.get(requestId);

        if (callbacks) {
            events.delete(requestId);

            if (callbacks.timer) {
                clearTimeout(callbacks.timer);
            }

            if (error) {
                callbacks.fail?.(error);
            } else {
                callbacks.success(await generateFakePosition(detail));
            }
        }
    });

    document.documentElement.addEventListener(
        "gs-response-watchpos",
        async (e) => {
            const { watcherId, detail, error } = e.detail;

            if (watchers.has(watcherId)) {
                const callbacks = watchers.get(watcherId);

                if (error) {
                    callbacks.fail?.(error);
                } else {
                    callbacks.success(await generateFakePosition(detail));
                }
            }
        }
    );

    if (document.location?.pathname?.startsWith("/maps")) {
        document.documentElement.addEventListener(
            "gs-map-request",
            async (e) => {
                const path = document.location.pathname;
                const split = path.split("@")[1]?.split(",");

                const lat = parseFloat(split?.[0]);
                const lng = parseFloat(split?.[1]);

                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                    document.documentElement.dispatchEvent(
                        new CustomEvent("gs-map-response", {
                            detail: { requestId: e.detail?.requestId, lat, lng },
                        })
                    );
                } else {
                    document.documentElement.dispatchEvent(
                        new CustomEvent("gs-map-response", {
                            detail: {
                                requestId: e.detail?.requestId,
                                error: "Invalid coordinates",
                            },
                        })
                    );
                }
            }
        )
    }
})();