// background.js - User9684

// This javascript files handling script injection for pages, and will inject into pages

const BrowserAPI = typeof browser !== "undefined" ? browser : chrome;

const ExtensionScripts = [
	{
		id: "gs-client",
		matches: ["*://*/*"],
		world: "MAIN",
		js: ["client.js"],
		allFrames: true,
	},
	{
		id: "gs-handler",
		matches: ["*://*/*"],
		world: "ISOLATED",
		js: ["handler.js"],
		allFrames: true,
	},
];

BrowserAPI.runtime.onInstalled.addListener(async () => {
	const existingData = await BrowserAPI.storage.local.get([
		"latitude",
		"longitude",
		"accuracy",
		"toggleRandomization",
		"enabled",
	]);

	BrowserAPI.storage.local.set({
		latitude: existingData.latitude ?? 0,
		longitude: existingData.longitude ?? 0,
		accuracy: existingData.accuracy ?? 100,
		toggleRandomization: existingData.toggleRandomization ?? false,
		enabled: existingData.enabled ?? true,
	});
});

BrowserAPI.runtime.onInstalled.addListener(
	async () => {
		await BrowserAPI.scripting.unregisterContentScripts({
			ids: ExtensionScripts.map(({ id }) => id),
		}).catch(() => { });

		await BrowserAPI.scripting.registerContentScripts(ExtensionScripts);
	},
);

BrowserAPI.runtime.onMessage.addListener((message) => {
	if (message?.type !== "gs-map-request") {
		return;
	}

	BrowserAPI.tabs.query(
		{ url: ["*://*.google.com/maps*", "*://maps.google.com/*"] },
		(tabs) => {
			for (const tab of tabs) {
				if (tab.id === undefined) {
					continue;
				}

				browserApi.tabs
					.sendMessage(tab.id, {
						...message,
						type: "gs-map-tab-request",
					})
					.catch(() => { });
			}
		},
	);
});
