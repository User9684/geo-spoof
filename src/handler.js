// handler.js - User9684

// This JavaScript file is injected into all pages and handles the
// requests sent by client.js and returns either spoofed geolocation or
// accurate geolocation accordingly.

const EVENT_HOLDER = document.documentElement;

const BrowserAPI = typeof browser !== "undefined" ? browser : chrome;

function ParseEventDetail(event) {
	if (typeof event.detail !== "string") {
		return null;
	}

	try {
		return JSON.parse(event.detail);
	}
	catch (_unused) {
		return null;
	}
}

function CreateEvent(name, detail) {
	return new CustomEvent(name, { detail: JSON.stringify(detail) });
}

async function getActualPosition() {
	return new Promise((resolve, reject) => {
		navigator.geolocation.getCurrentPosition(resolve, reject);
	});
}

async function getFakePosition() {
	const config = await BrowserAPI.storage.local.get([
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

BrowserAPI.runtime.onMessage.addListener((message) => {
	if (message?.type !== "gs-map-tab-request") {
		return;
	}

	const responseListener = (event) => {
		const detail = ParseEventDetail(event);

		if (detail?.requestId !== message.requestId) {
			return;
		}

		EVENT_HOLDER.removeEventListener(
			"gs-map-response",
			responseListener,
		);
		BrowserAPI.runtime.sendMessage({
			type: "gs-map-response",
			requestId: message.requestId,
			...detail,
		});
	};

	EVENT_HOLDER.addEventListener(
		"gs-map-response",
		responseListener,
	);
	EVENT_HOLDER.dispatchEvent(
		CreateEvent("gs-map-request", { requestId: message.requestId }),
	);
});

EVENT_HOLDER.addEventListener("gs-permission-request", async (e) => {
	const detail = ParseEventDetail(e);

	if (!detail) {
		return;
	}

	const config = await BrowserAPI.storage.local.get(["enabled"]);
	let state = "denied";

	if (config.enabled) {
		state = "granted";
	}
	else {
		try {
			const nativeStatus = await navigator.permissions.query({
				name: "geolocation",
			});
			state = nativeStatus.state;
		}
		catch (_unused) {
			state = "denied";
		}
	}

	EVENT_HOLDER.dispatchEvent(
		CreateEvent("gs-permission-response", {
			permissionRequestId: detail.permissionRequestId,
			state,
		}),
	);
});

function executeNativeGeolocation(method, args) {
	const geolocation = navigator.geolocation;

	if (method === "getCurrentPosition") {
		switch (args.length) {
			case 0:
				return geolocation.getCurrentPosition();
			case 1:
				return geolocation.getCurrentPosition(args[0]);
			case 2:
				return geolocation.getCurrentPosition(args[0], args[1]);
			default:
				return geolocation.getCurrentPosition(args[0], args[1], args[2]);
		}
	}

	switch (args.length) {
		case 0:
			return geolocation.watchPosition();
		case 1:
			return geolocation.watchPosition(args[0]);
		case 2:
			return geolocation.watchPosition(args[0], args[1]);
		default:
			return geolocation.watchPosition(args[0], args[1], args[2]);
	}
}

EVENT_HOLDER.addEventListener("gs-validation-request", (e) => {
	const detail = ParseEventDetail(e);

	if (!detail) {
		return;
	}

	const { validationId, method, args } = detail;
	const success = () => {};
	const fail = () => {};
	let error;

	try {
		const nativeArgs = args.map(argument =>
			argument && argument.__geospoofFunction ? success : argument,
		);
		const options = nativeArgs[2];
		const probeOptions
			= options !== null
			    && (typeof options === "object" || typeof options === "function")
				? new Proxy(options, {
					get(target, property, receiver) {
						if (property === "timeout") {
							return 0;
						}

						return Reflect.get(target, property, receiver);
					},
				})
				: options;
		const probeArgs = nativeArgs.slice();

		if (probeArgs.length >= 1 && typeof probeArgs[0] === "function") {
			probeArgs[0] = success;
		}

		if (probeArgs.length >= 2 && typeof probeArgs[1] === "function") {
			probeArgs[1] = fail;
		}

		if (probeArgs.length >= 3) {
			probeArgs[2] = probeOptions;
		}

		if (method === "getCurrentPosition") {
			executeNativeGeolocation(method, probeArgs);
		}
		else if (method === "watchPosition") {
			const watcherId = executeNativeGeolocation(method, probeArgs);
			navigator.geolocation.clearWatch(watcherId);
		}
	}
	catch (exception) {
		error = {
			name: exception.name,
			message: exception.message,
		};
	}

	EVENT_HOLDER.dispatchEvent(
		CreateEvent("gs-validation-response", { validationId, error }),
	);
});

EVENT_HOLDER.addEventListener("gs-request-cpos", async (e) => {
	const detail = ParseEventDetail(e);

	if (!detail) {
		return;
	}

	let data;
	let error;

	try {
		const config = await BrowserAPI.storage.local.get([
			"latitude",
			"longitude",
			"enabled",
		]);

		data = await getFakePosition();

		if (!config.enabled) {
			const actualPosition = await getActualPosition();
			data.latitude = actualPosition.coords.latitude;
			data.longitude = actualPosition.coords.longitude;
			data.accuracy = actualPosition.coords.accuracy;
		}
	}
	catch (exception) {
		error = {
			code: exception.code || 2,
			message: exception.message || "Position unavailable",
		};
	}

	EVENT_HOLDER.dispatchEvent(
		CreateEvent("gs-response-cpos", {
			requestId: detail.requestId,
			detail: data,
			error,
		}),
	);
});

EVENT_HOLDER.addEventListener("gs-request-watchpos", async (e) => {
	const detail = ParseEventDetail(e);

	if (!detail) {
		return;
	}

	const { watcherId } = detail;
	let error;

	try {
		const config = await BrowserAPI.storage.local.get([
			"latitude",
			"longitude",
			"enabled",
		]);

		data = await getFakePosition();

		if (!config.enabled) {
			const actualPosition = await getActualPosition();
			data.latitude = actualPosition.coords.latitude;
			data.longitude = actualPosition.coords.longitude;
			data.accuracy = actualPosition.coords.accuracy;
		}
	}
	catch (exception) {
		error = {
			code: exception.code || 2,
			message: exception.message || "Position unavailable",
		};
	}

	EVENT_HOLDER.dispatchEvent(
		CreateEvent("gs-response-watchpos", {
			watcherId,
			detail: data,
			error,
		}),
	);
});
