// test.js - User9684

// This JavaScript file is a combination of all the tests listed in the detection.md file
// It runs all of the listed tests and returns an object with the results of each one.

export async function runTests() {
	function getNativeCodeString(fnName) {
		// This is done because on FireFox, native code has newlines!
		let baseToStringOutput = toString.toString();

		return baseToStringOutput.replace("toString", fnName);
	}

	// Has to be defined inside the runTests function itself
	// so that it actually gets registered on executeScript
	const TestsArr = [];

	function registerTest(testName, testTarget, testFunction) {
		TestsArr.push({ testName, testTarget, testFunction });
	}

	// In an IIFE so that it can be collapsed in the editor, no other reason
	(() => {
		registerTest("API InstanceOf", "geolocationAPI", (geolocationAPI) => {
			return [geolocationAPI instanceof Geolocation, "Geolocation API is not an instance of Geolocation"];
		});

		registerTest("Position InstanceOf", "geolocation", (geolocation) => {
			return [geolocation instanceof GeolocationPosition, "Geolocation is not an instance of Position"];
		});

		registerTest("Coords InstanceOf", "geolocation", (geolocation) => {
			return [geolocation.coords instanceof GeolocationCoordinates, "Geolocation coords is not an instance of Coordinates"];
		});

		registerTest("API Method Prototypes", "geolocationAPI", (geolocationAPI) => {
			if (Object.getPrototypeOf(geolocationAPI).toString() !== "[object Geolocation]") {
				return [false, "Geolocation API prototype is invalid!"];
			}

			const methods = [geolocationAPI.getCurrentPosition, geolocationAPI.watchPosition, geolocationAPI.clearWatch];
			for (const method of methods) {
				if (Object.getPrototypeOf(method).toString() !== getNativeCodeString("")) {
					return [false, `Geolocation API method ${method.name} prototype is invalid!`];
				}
			}

			return [true, null];
		});

		registerTest("Position Method Prototypes", "geolocation", (geolocation) => {
			if (Object.getPrototypeOf(geolocation).toString() !== "[object GeolocationPosition]") {
				return [false, "Geolocation prototype is invalid!"];
			}

			if (Object.getPrototypeOf(geolocation.coords).toString() !== "[object GeolocationCoordinates]") {
				return [false, "Geolocation coords prototype is invalid!"];
			}

			return [true, null];
		});

		const recursiveToStringDepth = 25;
		registerTest("API Recursive toString", "geolocationAPI", (geolocationAPI) => {
			let lastItem = geolocationAPI;

			if (lastItem.toString() !== "[object Geolocation]") {
				return [false, "Geolocation API toString() is invalid!"];
			}
			lastItem = lastItem.toString;

			for (let i = 0; i < recursiveToStringDepth; i++) {
				if (lastItem.toString() !== getNativeCodeString("toString")) {
					return [false, `Geolocation API toString() is invalid at depth ${i}!`];
				}

				lastItem = lastItem.toString;
			}

			return [true, null];
		});
		registerTest("getCurrentPosition Recursive toString", "geolocationAPI", (geolocationAPI) => {
			let lastItem = geolocationAPI.getCurrentPosition;

			if (lastItem.toString() !== getNativeCodeString("getCurrentPosition")) {
				return [false, "getCurrentPosition API toString() is invalid!"];
			}
			lastItem = lastItem.toString;

			for (let i = 0; i < recursiveToStringDepth; i++) {
				if (lastItem.toString() !== getNativeCodeString("toString")) {
					return [false, `getCurrentPosition toString() is invalid at depth ${i}!`];
				}

				lastItem = lastItem.toString;
			}

			return [true, null];
		});

		registerTest("Function Metadata", "geolocationAPI", (geolocationAPI) => {
			const nativeMethods = [
				"getCurrentPosition",
				"watchPosition",
				"clearWatch",
			];

			for (const name of nativeMethods) {
				const method = geolocationAPI[name];
				const descriptor = Object.getOwnPropertyDescriptor(
					Object.getPrototypeOf(geolocationAPI),
					name,
				);

				if (method.name !== name || method.length !== descriptor.value.length) {
					return [false, `${name} metadata mismatch!`];
				}
			}

			return [true, null];
		});

		registerTest("Position Shape", "geolocation", (geolocation) => {
			if (Object.keys(geolocation).length !== 0) {
				return [false, "Position has unexpected enumerable properties!"];
			}

			if (Object.keys(geolocation.coords).length !== 0) {
				return [false, "Coordinates have unexpected enumerable properties!"];
			}

			for (const name of ["coords", "timestamp"]) {
				if (!(name in geolocation)) {
					return [false, `Position is missing ${name}!`];
				}
			}

			return [true, null];
		});

		registerTest("Permission API Disagreement", "geolocationAPI", async (geolocationAPI) => {
			const [permission, result] = await Promise.all([
				navigator.permissions.query({ name: "geolocation" }),
				new Promise((resolve) => {
					geolocationAPI.getCurrentPosition(
						() => resolve("success"),
						error => resolve(`error:${error.code}`),
					);
				}),
			]);

			if (permission.state === "denied" && result === "success") {
				return [false, "Permission state disagrees with geolocation result!"];
			}

			return [true, null];
		});

		/* Debug tests
		registerTest("Fail test", "geolocationAPI", () => {
			return [false, "Fail test"];
		});

		registerTest("Error test", "geolocationAPI", () => {
			throw new Error("Error test");
		});
		*/
	})();

	const geolocationAPI = navigator.geolocation;
	let geolocation = null;

	geolocation = await new Promise((resolve, reject) => {
		geolocationAPI.getCurrentPosition(
			(position) => {
				resolve(position);
			},
			(error) => {
				reject(error);
			},
		);
	});

	const results = {
		passed: [],
		failed: [],
		errored: [],

		position: {
			coords: {
				latitude: geolocation.coords.latitude,
				longitude: geolocation.coords.longitude,
				accuracy: geolocation.coords.accuracy,
			},
			timestamp: geolocation.timestamp,
		},
	};

	for (const test of TestsArr) {
		console.log(`Running test: ${test.testName}...`);

		let args = [];
		if (test.testTarget === "geolocation") {
			args.push(geolocation);
		}
		else if (test.testTarget === "geolocationAPI") {
			args.push(geolocationAPI);
		}

		try {
			const [passed, response] = await test.testFunction(...args);
			if (passed) {
				results.passed.push({
					testName: test.testName,
				});
			}
			else {
				results.failed.push({
					testName: test.testName,
					message: response,
				});
			}
		}
		catch (error) {
			console.log(`Test "${test.testName}" errored!`, error);
			results.errored.push({
				testName: test.testName,
				message: error.toString(),
			});
		}
	}

	return results;
}

runTests();
