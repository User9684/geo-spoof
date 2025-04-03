// background.js - User9684

// This javascript files handling script injection for pages, and will inject into pages

chrome.runtime.onInstalled.addListener(async () => {
    const existingData = await chrome.storage.local.get([
        "latitude",
        "longitude",
        "accuracy",
        "toggleRandomization",
        "enabled",
    ]);

    chrome.storage.local.set({
        latitude: existingData.latitude || 0,
        longitude: existingData.longitude || 0,
        accuracy: existingData.accuracy || 100,
        toggleRandomization:
            existingData.toggleRandomization !== undefined || false,
        enabled: existingData.enabled !== undefined || true,
    });
});

chrome.runtime.onInstalled.addListener(
    () => {
        chrome.scripting.registerContentScripts([
            {
                id: "gs-client",
                matches: ["*://*/*"],
                world: "MAIN",
                js: ["client.js"],
            },
            {
                id: "gs-handler",
                matches: ["*://*/*"],
                world: "ISOLATED",
                js: ["handler.js"],
            },
        ]);
    }
);
