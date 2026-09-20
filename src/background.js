// background.js - User9684

// This javascript files handling script injection for pages, and will inject into pages

const browserApi = typeof browser !== "undefined" ? browser : chrome;

browserApi.runtime.onInstalled.addListener(async () => {
	const existingData = await browserApi.storage.local.get([
		"latitude",
		"longitude",
		"accuracy",
		"toggleRandomization",
		"enabled",
	]);

	browserApi.storage.local.set({
		latitude: existingData.latitude ?? 0,
		longitude: existingData.longitude ?? 0,
		accuracy: existingData.accuracy ?? 100,
		toggleRandomization: existingData.toggleRandomization ?? false,
		enabled: existingData.enabled ?? true,
	});
});

browserApi.runtime.onInstalled.addListener(
	async () => {
		const scripts = [
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

		await browserApi.scripting.unregisterContentScripts({
			ids: scripts.map(({ id }) => id),
		}).catch(() => { });

		await browserApi.scripting.registerContentScripts(scripts);
	},
);

browserApi.runtime.onMessage.addListener((message) => {
	if (message?.type !== "gs-map-request") {
		return;
	}

	browserApi.tabs.query(
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
					.catch(() => {});
			}
		},
	);
});
