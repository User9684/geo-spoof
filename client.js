// client.js - User9684

// This JavaScript file is injected into all pages to modify geolocation
// functionality, resulting in spoofed geolocation.

(() => {
	const EVENT_HOLDER = document.documentElement;

	const events = new Map();
	const watchers = new Map();
	let watcherIdCounter = 0;
	let requestIdCounter = 0;
	let validationIdCounter = 0;
	let permissionRequestIdCounter = 0;
	const originalFunctionToString = Function.prototype.toString;
	const nativeFunctionSources = new WeakMap();
	const nativeFunctionToStringSource = originalFunctionToString.call(
		originalFunctionToString,
	);

	const nativeFunctionToString = new Proxy(originalFunctionToString, {
		apply(target, thisArg, args) {
			const registeredSource = nativeFunctionSources.get(thisArg);

			if (registeredSource) {
				return registeredSource;
			}

			return Reflect.apply(target, thisArg, args);
		},
	});
	nativeFunctionSources.set(
		nativeFunctionToString,
		nativeFunctionToStringSource,
	);
	Function.prototype.toString = nativeFunctionToString;

	function createNativeLikeObject(prototype, properties) {
		const target = Object.create(prototype);
		const propertyNames = Object.keys(properties);

		Object.defineProperties(
			target,
			Object.fromEntries(
				propertyNames.map(name => [
					name,
					{
						value: properties[name],
						enumerable: false,
						writable: false,
						configurable: true,
					},
				]),
			),
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
			onchange: {
				value: null,
				enumerable: true,
				writable: true,
				configurable: true,
			},
		});

		return new Proxy(target, {
			get(object, name, receiver) {
				if (name === "state") {
					return state;
				}

				return Reflect.get(object, name, receiver);
			},
		});
	}

	function getSpoofedPermissionState() {
		const permissionRequestId = ++permissionRequestIdCounter;

		return new Promise((resolve) => {
			const listener = (event) => {
				if (
					!event.detail
					|| event.detail.permissionRequestId !== permissionRequestId
				) {
					return;
				}

				EVENT_HOLDER.removeEventListener(
					"gs-permission-response",
					listener,
				);
				resolve(createPermissionStatus(event.detail.state));
			};

			EVENT_HOLDER.addEventListener(
				"gs-permission-response",
				listener,
			);
			EVENT_HOLDER.dispatchEvent(
				new CustomEvent("gs-permission-request", {
					detail: { permissionRequestId },
				}),
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
					args[1],
				);
			default:
				return originalFunction.call(
					receiver,
					args[0],
					args[1],
					args[2],
				);
		}
	}

	function validateNativeArguments(method, originalFunction, args) {
		const validationId = ++validationIdCounter;
		const callerStack = new Error().stack;
		let validationError;
		const validationArgs = args.map(argument =>
			typeof argument === "function"
				? { __geospoofFunction: true }
				: argument,
		);

		const listener = (event) => {
			if (!event.detail || event.detail.validationId !== validationId) {
				return;
			}

			validationError = event.detail.error;
		};

		EVENT_HOLDER.addEventListener(
			"gs-validation-response",
			listener,
			{ once: true },
		);
		EVENT_HOLDER.dispatchEvent(
			new CustomEvent("gs-validation-request", {
				detail: { validationId, method, args: validationArgs },
			}),
		);

		if (validationError) {
			let error;

			try {
				executeWithNativeArity(navigator.geolocation, originalFunction, args);
			}
			catch (nativeError) {
				error = nativeError;
			}

			if (!error) {
				error = new Error(validationError.message);
				error.name = validationError.name;
			}

			error.message = error.message.replace(
				/^Failed to execute '[^']+' on '[^']+': /,
				"",
			);

			if (callerStack) {
				const callSite = callerStack
					.split("\n")
					.slice(1)
					.filter(line => !line.includes("client.js"))
					.join("\n");
				error.stack = `${error.name}: ${error.message}\n${callSite}`;
			}

			throw error;
		}
	}

	function generateSpoofedFunction(originalFunction, newFunction) {
		const spoofedFunction = new Proxy(originalFunction, {
			apply(target, thisArg, args) {
				return newFunction.apply(thisArg, args);
			},
		});

		nativeFunctionSources.set(
			spoofedFunction,
			originalFunctionToString.call(originalFunction),
		);

		return spoofedFunction;
	}

	const originalGetCurrentPosition
		= window.navigator.geolocation.getCurrentPosition;
	const originalWatchPosition = window.navigator.geolocation.watchPosition;
	const originalClearWatch = window.navigator.geolocation.clearWatch;
	const originalPermissionsQuery = window.navigator.permissions.query;

	const geolocationPrototype = Object.getPrototypeOf(
		window.navigator.geolocation,
	);
	const permissionsPrototype = Object.getPrototypeOf(
		window.navigator.permissions,
	);

	function installGeolocationMethod(name, method) {
		const descriptor = Object.getOwnPropertyDescriptor(
			geolocationPrototype,
			name,
		);

		if (!descriptor?.configurable) {
			return false;
		}

		Object.defineProperty(geolocationPrototype, name, {
			...descriptor,
			value: method,
		});
		return true;
	}

	const spoofedGetCurrentPosition = generateSpoofedFunction(
		originalGetCurrentPosition,
		function (...args) {
			validateNativeArguments(
				"getCurrentPosition",
				originalGetCurrentPosition,
				args,
			);

			const [success, fail, options] = args;

			const requestId = ++requestIdCounter;
			const newEvent = new CustomEvent("gs-request-cpos", {
				detail: { requestId, options },
			});
			const callbacks = { success, fail, timer: null };

			if (Number.isFinite(options?.timeout)) {
				callbacks.timer = setTimeout(() => {
					if (events.delete(requestId) && fail) {
						const timeoutExpiredResp = createNativeLikeObject(
							GeolocationPositionError.prototype,
							{
								code: 3,
								message: "Timeout expired",
							},
						);

						queueMicrotask(
							fail.bind(undefined, timeoutExpiredResp),
						);
					}
				}, options.timeout);
			}

			events.set(requestId, callbacks);

			EVENT_HOLDER.dispatchEvent(newEvent);
		},
	);

	const spoofedWatchPosition = generateSpoofedFunction(
		originalWatchPosition,
		function (...args) {
			validateNativeArguments("watchPosition", originalWatchPosition, args);

			const [success, fail, options] = args;

			const watcherId = ++watcherIdCounter;

			const newEvent = new CustomEvent("gs-request-watchpos", {
				detail: { watcherId, options },
			});
			watchers.set(watcherId, { success, fail });

			EVENT_HOLDER.dispatchEvent(newEvent);

			return watcherId;
		},
	);

	const spoofedClearWatch = generateSpoofedFunction(
		originalClearWatch,
		function (watcherId) {
			if (watchers.has(watcherId)) {
				watchers.delete(watcherId);
			}
		},
	);

	installGeolocationMethod(
		"getCurrentPosition",
		spoofedGetCurrentPosition,
	) || (window.navigator.geolocation.getCurrentPosition
		= spoofedGetCurrentPosition);
	installGeolocationMethod("watchPosition", spoofedWatchPosition)
	|| (window.navigator.geolocation.watchPosition = spoofedWatchPosition);
	installGeolocationMethod("clearWatch", spoofedClearWatch)
	|| (window.navigator.geolocation.clearWatch = spoofedClearWatch);

	const spoofedPermissionsQuery = generateSpoofedFunction(
		originalPermissionsQuery,
		function (...args) {
			executeWithNativeArity(
				navigator.permissions,
				originalPermissionsQuery,
				args,
			);

			if (args[0]?.name !== "geolocation") {
				return executeWithNativeArity(
					navigator.permissions,
					originalPermissionsQuery,
					args,
				);
			}

			return getSpoofedPermissionState();
		},
	);

	const permissionsQueryDescriptor = Object.getOwnPropertyDescriptor(
		permissionsPrototype,
		"query",
	);

	if (permissionsQueryDescriptor?.configurable) {
		Object.defineProperty(permissionsPrototype, "query", {
			...permissionsQueryDescriptor,
			value: spoofedPermissionsQuery,
		});
	}

	EVENT_HOLDER.addEventListener("gs-response-cpos", async (e) => {
		const { requestId, detail, error } = e.detail;
		const callbacks = events.get(requestId);

		if (callbacks) {
			events.delete(requestId);

			if (callbacks.timer) {
				clearTimeout(callbacks.timer);
			}

			if (error) {
				const callback = callbacks.fail;

				if (callback) {
					queueMicrotask(callback.bind(undefined, error));
				}
			}
			else {
				const position = await generateFakePosition(detail);
				const callback = callbacks.success;

				queueMicrotask(callback.bind(undefined, position));
			}
		}
	});

	EVENT_HOLDER.addEventListener(
		"gs-response-watchpos",
		async (e) => {
			const { watcherId, detail, error } = e.detail;

			if (watchers.has(watcherId)) {
				const callbacks = watchers.get(watcherId);

				if (error) {
					const callback = callbacks.fail;

					if (callback) {
						queueMicrotask(callback.bind(undefined, error));
					}
				}
				else {
					const position = await generateFakePosition(detail);
					const callback = callbacks.success;

					queueMicrotask(callback.bind(undefined, position));
				}
			}
		},
	);

	if (document.location?.pathname?.startsWith("/maps")) {
		EVENT_HOLDER.addEventListener(
			"gs-map-request",
			async (e) => {
				const path = document.location.pathname;
				const split = path.split("@")[1]?.split(",");

				const lat = parseFloat(split?.[0]);
				const lng = parseFloat(split?.[1]);

				if (Number.isFinite(lat) && Number.isFinite(lng)) {
					EVENT_HOLDER.dispatchEvent(
						new CustomEvent("gs-map-response", {
							detail: { requestId: e.detail?.requestId, lat, lng },
						}),
					);
				}
				else {
					EVENT_HOLDER.dispatchEvent(
						new CustomEvent("gs-map-response", {
							detail: {
								requestId: e.detail?.requestId,
								error: "Invalid coordinates",
							},
						}),
					);
				}
			},
		);
	}
})();
