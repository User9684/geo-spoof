// handler.js - User9684

// This JavaScript file is injected into all pages and handles the 
// requests sent by client.js and returns either spoofed geolocation or 
// accurate geolocation accordingly.

async function getActualPosition() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}

async function getFakePosition() {
    const config = await chrome.storage.local.get([
        "latitude",
        "longitude",
        "accuracy",
        "toggleRandomization",
        "enabled",
    ]);

    const data = {
        latitude: config.latitude,
        longitude: config.longitude,
        accuracy: config.accuracy,
    };

    if (config.toggleRandomization) {
        const degreesPerMeterLatitude = 1 / 111320; // 1 degree = 111320 meters roughly
        const degreesPerMeterLongitude = 1 / (111320 * Math.cos(data.latitude * Math.PI / 180)); // Varies with latitude
    
        const offsetLatitude = (Math.random() - 0.5) * degreesPerMeterLatitude * config.accuracy;
        const offsetLongitude = (Math.random() - 0.5) * degreesPerMeterLongitude * config.accuracy;
    
        data.latitude += offsetLatitude;
        data.longitude += offsetLongitude;
    }
    

    return data;
}

const activeWatchers = new Map();

document.documentElement.addEventListener("gs-request-cpos", async () => {
    const config = await chrome.storage.local.get([
        "latitude",
        "longitude",
        "enabled",
    ]);

    const actualPosition = await getActualPosition();
    const data = await getFakePosition();

    if (!config.enabled) {
        data.latitude = actualPosition.coords.latitude;
        data.longitude = actualPosition.coords.longitude;
        data.accuracy = actualPosition.coords.accuracy;
    }

    document.documentElement.dispatchEvent(
        new CustomEvent("gs-response-cpos", {
            detail: data,
        })
    );
});

document.documentElement.addEventListener("gs-request-watchpos", async (e) => {
    const config = await chrome.storage.local.get([
        "latitude",
        "longitude",
        "enabled",
    ]);

    const actualPosition = await getActualPosition();
    const data = {
        latitude: actualPosition.coords.latitude,
        longitude: actualPosition.coords.longitude,
        accuracy: actualPosition.coords.accuracy,
    };

    if (config.enabled) {
        data.latitude = config.latitude;
        data.longitude = config.longitude;
        data.accuracy = 100;
    }

    document.documentElement.dispatchEvent(
        new CustomEvent("gs-response-watchpos", {
            detail: {
                watcherId,
                detail: data,
            },
        })
    );
});
