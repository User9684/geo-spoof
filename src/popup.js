// popup.js - User9684

// This javascript file handles the input from the extension popup, along with
// rendering pre-existing data.

import { runTests } from "./tests.js";

const BadCoordsError = Error("Invalid coordinates value");
const EnabledNaBError = Error('"enabled" is not a bool');

const BrowserAPI = typeof browser !== "undefined" ? browser : chrome;

async function getConfiguration() {
	const data = await BrowserAPI.storage.local.get([
		"latitude",
		"longitude",
		"accuracy",
		"toggleRandomization",
		"enabled",
		"activeLocation",
		"savedLocations",
	]);
	const storedActiveLocation = NormalizeLocation(data.activeLocation);
	const activeLocation = storedActiveLocation || NormalizeLocation(data) || {
		latitude: 0,
		longitude: 0,
		accuracy: 100,
		toggleRandomization: false,
	};

	return {
		...data,
		activeLocation,
		needsMigration: !storedActiveLocation || !Array.isArray(data.savedLocations),
		savedLocations: Array.isArray(data.savedLocations)
			? data.savedLocations
				.map(location => ({
					name: String(location?.name || "Unnamed location").trim(),
					...NormalizeLocation(location),
				}))
				.filter(location => NormalizeLocation(location))
			: [],
	};
}

async function setActiveLocation(location) {
	const activeLocation = NormalizeLocation(location);

	await BrowserAPI.storage.local.set({
		...activeLocation,
		activeLocation,
	});
}

function getFormattedLocation(location) {
	return `${location.latitude}, ${location.longitude}`;
}

function NormalizeLocation(location) {
	if (!location || typeof location !== "object") {
		return null;
	}

	const normalized = {
		latitude: Number(location.latitude),
		longitude: Number(location.longitude),
		accuracy: Number(location.accuracy),
		toggleRandomization: Boolean(location.toggleRandomization),
	};

	if (
		!Number.isFinite(normalized.latitude)
		|| !Number.isFinite(normalized.longitude)
		|| !Number.isFinite(normalized.accuracy)
		|| normalized.accuracy <= 0
	) {
		return null;
	}

	return normalized;
}

document.addEventListener("DOMContentLoaded", () => {
	const latitudeInput = document.getElementById("latitude");
	const longitudeInput = document.getElementById("longitude");
	const accuracyInput = document.getElementById("accuracy");
	const rawDataInput = document.getElementById("raw");
	const enabledToggle = document.getElementById("enabled");
	const randomizationToggle = document.getElementById("toggleRandomization");
	const statusDisplay = document.getElementById("status");
	const savedLocationsDisplay = document.getElementById("savedLocations");
	const runTestsButton = document.getElementById("runTests");
	const testResultsDisplay = document.getElementById("testResults");
	let draggedLocationIndex = null;
	let dropPlaceholder = null;
	let dropHandled = false;

	function getLocationFromForm() {
		const location = {
			latitude: parseFloat(latitudeInput.value),
			longitude: parseFloat(longitudeInput.value),
			accuracy: parseInt(accuracyInput.value, 10),
			toggleRandomization: randomizationToggle.checked,
		};

		if (
			!Number.isFinite(location.latitude)
			|| !Number.isFinite(location.longitude)
			|| !Number.isFinite(location.accuracy)
			|| location.accuracy <= 0
		) {
			return null;
		}

		return location;
	}

	function updateForm(location) {
		latitudeInput.value = location.latitude;
		longitudeInput.value = location.longitude;
		accuracyInput.value = location.accuracy;
		randomizationToggle.checked = location.toggleRandomization;
	}

	function renderTestResults(results) {
		testResultsDisplay.replaceChildren();

		const tests = [
			...results.failed.map(test => ({ ...test, status: "Failed", response: test.message })),
			...results.errored.map(test => ({ ...test, status: "Error", response: test.message })),
			...results.passed.map(test => ({ ...test, status: "Passed", response: "No issues detected." })),
		];

		for (const test of tests) {
			const result = document.createElement("div");
			result.className = `test-result test-${test.status.toLowerCase()}`;

			const heading = document.createElement("div");
			heading.className = "test-result-heading";

			const name = document.createElement("strong");
			name.className = "test-name";
			name.textContent = test.testName;

			const status = document.createElement("span");
			status.className = "test-status";
			status.textContent = test.status;

			const response = document.createElement("p");
			response.className = "test-response";
			response.textContent = test.response;

			heading.append(name, status);
			result.append(heading, response);
			testResultsDisplay.append(result);
		}

		console.log(results.position);
	}

	function renderSavedLocations(savedLocations) {
		savedLocationsDisplay.replaceChildren();
		dropPlaceholder = null;

		if (savedLocations.length === 0) {
			const emptyState = document.createElement("p");
			emptyState.className = "empty-state";
			emptyState.textContent = "No saved locations yet.";
			savedLocationsDisplay.append(emptyState);
			return;
		}

		savedLocations.forEach((location, index) => {
			const item = document.createElement("article");
			item.className = "saved-location";
			item.draggable = true;
			item.dataset.index = index;

			const details = document.createElement("div");
			details.className = "saved-details";

			const name = document.createElement("strong");
			name.textContent = location.name;
			const coordinates = document.createElement("span");
			coordinates.textContent = getFormattedLocation(location);
			details.append(name, coordinates);

			const controls = document.createElement("div");
			controls.className = "saved-controls";

			const activateButton = document.createElement("button");
			activateButton.className = "icon-button activate-location";
			activateButton.type = "button";
			activateButton.title = "Use this location";
			activateButton.setAttribute("aria-label", `Use ${location.name}`);
			activateButton.textContent = "Use";
			activateButton.addEventListener("click", () => activateLocation(location));

			const moveUpButton = document.createElement("button");
			moveUpButton.className = "icon-button move-location";
			moveUpButton.type = "button";
			moveUpButton.title = "Move up";
			moveUpButton.setAttribute("aria-label", `Move ${location.name} up`);
			moveUpButton.textContent = "↑";
			moveUpButton.disabled = index === 0;
			moveUpButton.addEventListener("click", () => moveLocation(index, -1));

			const moveDownButton = document.createElement("button");
			moveDownButton.className = "icon-button move-location";
			moveDownButton.type = "button";
			moveDownButton.title = "Move down";
			moveDownButton.setAttribute("aria-label", `Move ${location.name} down`);
			moveDownButton.textContent = "↓";
			moveDownButton.disabled = index === savedLocations.length - 1;
			moveDownButton.addEventListener("click", () => moveLocation(index, 1));

			const removeButton = document.createElement("button");
			removeButton.className = "icon-button remove-location";
			removeButton.type = "button";
			removeButton.title = "Remove this location";
			removeButton.setAttribute("aria-label", `Remove ${location.name}`);
			removeButton.textContent = "×";
			removeButton.addEventListener("click", () => removeLocation(index));

			controls.append(activateButton, moveUpButton, moveDownButton, removeButton);
			item.append(details, controls);
			item.addEventListener("dragstart", () => {
				draggedLocationIndex = index;
				dropHandled = false;
				dropPlaceholder = document.createElement("div");
				dropPlaceholder.className = "saved-location-placeholder";
				dropPlaceholder.setAttribute("aria-hidden", "true");
				item.after(dropPlaceholder);
				item.classList.add("is-dragging");
			});
			item.addEventListener("dragend", () => {
				if (draggedLocationIndex !== null && !dropHandled && dropPlaceholder) {
					const targetIndex = [...savedLocationsDisplay.children].indexOf(dropPlaceholder);
					reorderLocations(targetIndex);
				}

				draggedLocationIndex = null;
				item.classList.remove("is-dragging");
				dropPlaceholder?.remove();
				dropPlaceholder = null;
				dropHandled = false;
			});
			savedLocationsDisplay.append(item);
		});
	}

	async function activateLocation(location) {
		if (!window.confirm("Are you sure? Swapping will replace your current configuation.")) {
			return;
		}

		await setActiveLocation(location);
		updateForm(location);
		await updateStatus();
	}

	async function removeLocation(index) {
		const configuration = await getConfiguration();
		configuration.savedLocations.splice(index, 1);
		await BrowserAPI.storage.local.set({ savedLocations: configuration.savedLocations });
		renderSavedLocations(configuration.savedLocations);
	}

	function updateDropPlaceholder(pointerY) {
		if (draggedLocationIndex === null || !dropPlaceholder) {
			return;
		}

		const locations = [...savedLocationsDisplay.querySelectorAll(".saved-location:not(.is-dragging)")];
		const nextLocation = locations.find((location) => {
			const bounds = location.getBoundingClientRect();
			return pointerY < bounds.top + bounds.height / 2;
		});

		if (nextLocation) {
			savedLocationsDisplay.insertBefore(dropPlaceholder, nextLocation);
		}
		else {
			savedLocationsDisplay.append(dropPlaceholder);
		}
	}

	async function reorderLocations(targetIndex) {
		if (
			draggedLocationIndex === null
			|| targetIndex < 0
		) {
			return;
		}

		const sourceIndex = draggedLocationIndex;
		const configuration = await getConfiguration();
		const [movedLocation] = configuration.savedLocations.splice(
			sourceIndex,
			1,
		);
		if (sourceIndex < targetIndex) {
			targetIndex -= 1;
		}
		configuration.savedLocations.splice(targetIndex, 0, movedLocation);
		await BrowserAPI.storage.local.set({ savedLocations: configuration.savedLocations });
		draggedLocationIndex = null;
		renderSavedLocations(configuration.savedLocations);
	}

	async function moveLocation(index, direction) {
		const configuration = await getConfiguration();
		const targetIndex = index + direction;

		if (targetIndex < 0 || targetIndex >= configuration.savedLocations.length) {
			return;
		}

		const [movedLocation] = configuration.savedLocations.splice(index, 1);
		configuration.savedLocations.splice(targetIndex, 0, movedLocation);
		await BrowserAPI.storage.local.set({ savedLocations: configuration.savedLocations });
		renderSavedLocations(configuration.savedLocations);
	}

	savedLocationsDisplay.addEventListener("dragover", (event) => {
		if (draggedLocationIndex === null) {
			return;
		}

		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
		updateDropPlaceholder(event.clientY);
	});

	savedLocationsDisplay.addEventListener("drop", (event) => {
		if (draggedLocationIndex === null || !dropPlaceholder) {
			return;
		}

		event.preventDefault();
		dropHandled = true;
		const targetIndex = [...savedLocationsDisplay.children].indexOf(dropPlaceholder);
		reorderLocations(targetIndex);
	});

	document.getElementById("useMapsPosition").addEventListener("click", () => {
		const requestId = `${Date.now()}-${Math.random()}`;
		let responseReceived = false;

		const responseListener = (message) => {
			if (
				message?.type !== "gs-map-response"
				|| message.requestId !== requestId
			) {
				return;
			}

			responseReceived = true;
			BrowserAPI.runtime.onMessage.removeListener(responseListener);

			if (
				Number.isFinite(message.lat)
				&& Number.isFinite(message.lng)
			) {
				if (window.confirm(`Use coords ${message.lat}, ${message.lng}?`)) {
					latitudeInput.value = message.lat;
					longitudeInput.value = message.lng;
				}
			}
			else {
				alert("Invalid coordinates");
			}
		};

		BrowserAPI.runtime.onMessage.addListener(responseListener);
		BrowserAPI.runtime.sendMessage({ type: "gs-map-request", requestId });

		setTimeout(() => {
			BrowserAPI.runtime.onMessage.removeListener(responseListener);
			if (!responseReceived) {
				alert("Could not get coords, do you have google maps open?");
			}
		}, 1000);
	});

	runTestsButton.addEventListener("click", async () => {
		runTestsButton.disabled = true;
		testResultsDisplay.replaceChildren();
		const loading = document.createElement("div");
		loading.className = "test-results-message";
		loading.textContent = "Running tests...";
		testResultsDisplay.append(loading);

		try {
			const [tab] = await BrowserAPI.tabs.query({
				active: true,
				currentWindow: true,
			});

			if (!tab?.id) {
				throw new Error("Could not find the active tab.");
			}

			const [execution] = await BrowserAPI.scripting.executeScript({
				target: { tabId: tab.id },
				world: "MAIN",
				func: runTests,
			});
			const results = execution.result;
			renderTestResults(results);
		}
		catch (error) {
			testResultsDisplay.replaceChildren();
			const errorMessage = document.createElement("div");
			errorMessage.className = "test-results-message test-error";
			errorMessage.textContent = `Could not run tests: ${error.message}`;
			testResultsDisplay.append(errorMessage);
		}
		finally {
			runTestsButton.disabled = false;
		}
	});

	document.getElementById("saveLocation").addEventListener("click", async () => {
		const location = getLocationFromForm();
		if (!location) {
			alert("Please enter valid latitude, longitude, and accuracy values.");
			return;
		}

		const name = window.prompt("Name this location:");
		if (!name?.trim()) {
			return;
		}

		const configuration = await getConfiguration();
		configuration.savedLocations.push({
			name: name.trim(),
			...location,
		});
		await BrowserAPI.storage.local.set({ savedLocations: configuration.savedLocations });
		renderSavedLocations(configuration.savedLocations);
	});

	document.getElementById("confirmRawData").addEventListener("click", () => {
		try {
			const newData = JSON.parse(rawDataInput.value);
			const activeLocation = NormalizeLocation(newData.activeLocation) || NormalizeLocation(newData);

			if (!activeLocation) {
				throw BadCoordsError;
			}
			if (typeof newData.enabled !== "boolean") {
				throw EnabledNaBError;
			}

			const savedLocations = Array.isArray(newData.savedLocations)
				? newData.savedLocations
					.map(location => ({
						name: String(location?.name || "Unnamed location").trim(),
						...NormalizeLocation(location),
					}))
					.filter(location => NormalizeLocation(location))
				: [];

			BrowserAPI.storage.local.set({
				...activeLocation,
				activeLocation,
				savedLocations,
				enabled: newData.enabled,
			}, updateStatus);
		}
		catch (e) {
			alert("Please enter a valid JSON value. " + e);
		}
	});

	document.getElementById("confirmData").addEventListener("click", () => {
		const location = getLocationFromForm();
		const enabledValue = enabledToggle.checked;

		if (!location) {
			alert(
				"Please enter valid latitude, longitude, and accuracy values.",
			);
			return;
		}

		BrowserAPI.storage.local.set(
			{
				...location,
				activeLocation: location,
				enabled: enabledValue,
			},
			() => {
				alert("Settings set successfully!");
				updateStatus();
			},
		);
	});

	// Update the status display
	async function updateStatus() {
		const data = await getConfiguration();
		const { activeLocation } = data;

		if (data.needsMigration) {
			await BrowserAPI.storage.local.set({
				...activeLocation,
				activeLocation,
				savedLocations: data.savedLocations,
			});
		}

		updateForm(activeLocation);
		enabledToggle.checked = data.enabled || false;
		rawDataInput.value = JSON.stringify({
			...data,
			activeLocation,
			savedLocations: data.savedLocations,
		});
		renderSavedLocations(data.savedLocations);

		statusDisplay.textContent = `
            Spoofer is ${data.enabled ? "enabled" : "disabled"}.
            Current Location: ${activeLocation.latitude}, ${activeLocation.longitude
			}.
            Accuracy: ${activeLocation.accuracy} meters.
            Randomization is ${activeLocation.toggleRandomization ? "enabled" : "disabled"
			}.
        `.trim();
	}

	BrowserAPI.storage.local.get(
		["latitude", "longitude", "accuracy", "toggleRandomization", "enabled"],
		() => {
			updateStatus();
		},
	);
});
