// popup.js - User9684

// This javascript file handles the input from the extension popup, along with
// rendering pre-existing data.

const BadCoordsError = Error("Invalid coordinates value");
const EnabledNaBError = Error('"enabled" is not a bool');

document.addEventListener("DOMContentLoaded", () => {
	const latitudeInput = document.getElementById("latitude");
	const longitudeInput = document.getElementById("longitude");
	const accuracyInput = document.getElementById("accuracy");
	const rawDataInput = document.getElementById("raw");
	const enabledToggle = document.getElementById("enabled");
	const randomizationToggle = document.getElementById("toggleRandomization");
	const statusDisplay = document.getElementById("status");
	const savedLocationsDisplay = document.getElementById("savedLocations");
	let draggedLocationIndex = null;

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

	function normalizeLocation(location) {
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

	async function getConfiguration() {
		const data = await chrome.storage.local.get([
			"latitude",
			"longitude",
			"accuracy",
			"toggleRandomization",
			"enabled",
			"activeLocation",
			"savedLocations",
		]);
		const storedActiveLocation = normalizeLocation(data.activeLocation);
		const activeLocation = storedActiveLocation
		    || normalizeLocation(data) || {
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
						...normalizeLocation(location),
					}))
					.filter(location => normalizeLocation(location))
				: [],
		};
	}

	async function setActiveLocation(location) {
		const activeLocation = normalizeLocation(location);

		await chrome.storage.local.set({
			...activeLocation,
			activeLocation,
		});
	}

	function updateForm(location) {
		latitudeInput.value = location.latitude;
		longitudeInput.value = location.longitude;
		accuracyInput.value = location.accuracy;
		randomizationToggle.checked = location.toggleRandomization;
	}

	function locationSummary(location) {
		return `${location.latitude}, ${location.longitude}`;
	}

	function renderSavedLocations(savedLocations) {
		savedLocationsDisplay.replaceChildren();

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
			coordinates.textContent = locationSummary(location);
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

			const removeButton = document.createElement("button");
			removeButton.className = "icon-button remove-location";
			removeButton.type = "button";
			removeButton.title = "Remove this location";
			removeButton.setAttribute("aria-label", `Remove ${location.name}`);
			removeButton.textContent = "×";
			removeButton.addEventListener("click", () => removeLocation(index));

			controls.append(activateButton, removeButton);
			item.append(details, controls);
			item.addEventListener("dragstart", () => {
				draggedLocationIndex = index;
				item.classList.add("is-dragging");
			});
			item.addEventListener("dragend", () => {
				draggedLocationIndex = null;
				item.classList.remove("is-dragging");
			});
			item.addEventListener("dragover", event => event.preventDefault());
			item.addEventListener("drop", () => reorderLocations(index));
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
		await chrome.storage.local.set({ savedLocations: configuration.savedLocations });
		renderSavedLocations(configuration.savedLocations);
	}

	async function reorderLocations(targetIndex) {
		if (
			draggedLocationIndex === null
			|| draggedLocationIndex === targetIndex
		) {
			return;
		}

		const configuration = await getConfiguration();
		const [movedLocation] = configuration.savedLocations.splice(
			draggedLocationIndex,
			1,
		);
		configuration.savedLocations.splice(targetIndex, 0, movedLocation);
		await chrome.storage.local.set({ savedLocations: configuration.savedLocations });
		renderSavedLocations(configuration.savedLocations);
	}

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
			chrome.runtime.onMessage.removeListener(responseListener);

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

		chrome.runtime.onMessage.addListener(responseListener);
		chrome.runtime.sendMessage({ type: "gs-map-request", requestId });

		setTimeout(() => {
			chrome.runtime.onMessage.removeListener(responseListener);
			if (!responseReceived) {
				alert("Could not get coords, do you have google maps open?");
			}
		}, 1000);
	});

	chrome.storage.local.get(
		["latitude", "longitude", "accuracy", "toggleRandomization", "enabled"],
		() => {
			updateStatus();
		},
	);

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
		await chrome.storage.local.set({ savedLocations: configuration.savedLocations });
		renderSavedLocations(configuration.savedLocations);
	});

	document.getElementById("confirmRawData").addEventListener("click", () => {
		try {
			const newData = JSON.parse(rawDataInput.value);
			const activeLocation = normalizeLocation(newData.activeLocation)
			    || normalizeLocation(newData);

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
						...normalizeLocation(location),
					}))
					.filter(location => normalizeLocation(location))
				: [];

			chrome.storage.local.set({
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

		chrome.storage.local.set(
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
			await chrome.storage.local.set({
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
});
