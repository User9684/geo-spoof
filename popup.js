// popup.js - User9684

// This javascript file handles the input from the extension popup, along with
// rendering pre-existing data.

const LatNaNError = Error('"latitude" is not a number');
const LongNaNError = Error('"longitude" is not a number');
const AccNaNError = Error('"accuracy" is not a number');
const EnabledNaBError = Error('"enabled" is not a bool');
const RandomizationNaBError = Error('"toggleRandomization" is not a bool');

document.addEventListener("DOMContentLoaded", () => {
    const latitudeInput = document.getElementById("latitude");
    const longitudeInput = document.getElementById("longitude");
    const accuracyInput = document.getElementById("accuracy");
    const rawDataInput = document.getElementById("raw");
    const enabledToggle = document.getElementById("enabled");
    const randomizationToggle = document.getElementById("toggleRandomization");
    const statusDisplay = document.getElementById("status");

    chrome.storage.local.get(
        ["latitude", "longitude", "accuracy", "toggleRandomization", "enabled"],
        (data) => {
            updateStatus();
        }
    );

    document.getElementById("confirmRawData").addEventListener("click", () => {
        try {
            const newData = JSON.parse(rawDataInput.value);
            console.log(newData);
            if (typeof newData.latitude !== "number") {
                throw LatNaNError;
            }
            if (typeof newData.longitude !== "number") {
                throw LongNaNError;
            }
            if (typeof newData.accuracy !== "number") {
                throw AccNaNError;
            }
            if (typeof newData.enabled !== "boolean") {
                throw EnabledNaBError;
            }
            if (typeof newData.toggleRandomization !== "boolean") {
                throw RandomizationNaBError;
            }

            chrome.storage.local.set(newData, () => {
                updateStatus();
            });
        } catch (e) {
            alert("Please enter a valid JSON value. " + e);
        }
    });

    document.getElementById("confirmData").addEventListener("click", () => {
        const latitudeValue = parseFloat(latitudeInput.value);
        const longitudeValue = parseFloat(longitudeInput.value);
        const accuracyValue = parseInt(accuracyInput.value);
        const enabledValue = enabledToggle.checked;
        const randomizationEnabledValue = toggleRandomization.checked;

        if (
            isNaN(latitudeValue) ||
            isNaN(longitudeValue) ||
            isNaN(accuracyValue) ||
            accuracyValue <= 0
        ) {
            alert(
                "Please enter valid latitude, longitude, and accuracy values."
            );
            return;
        }

        chrome.storage.local.set(
            {
                latitude: latitudeValue,
                longitude: longitudeValue,
                accuracy: accuracyValue,
                enabled: enabledValue,
                toggleRandomization: randomizationEnabledValue,
            },
            () => {
                alert("Settings set successfully!");
                updateStatus();
            }
        );
    });

    // Update the status display
    async function updateStatus() {
        const data = await chrome.storage.local.get([
            "latitude",
            "longitude",
            "accuracy",
            "toggleRandomization",
            "enabled",
        ]);

        latitudeInput.value = data.latitude || "N/A";
        longitudeInput.value = data.longitude || "N/A";
        accuracyInput.value = data.accuracy || 100;
        enabledToggle.checked = data.enabled || false;
        randomizationToggle.checked = data.toggleRandomization || false;
        rawDataInput.value = JSON.stringify(data);

        statusDisplay.textContent = `
            Spoofer is ${data.enabled ? "enabled" : "disabled"}.
            Current Location: ${data.latitude || "N/A"}, ${
            data.longitude || "N/A"
        }.
            Accuracy: ${data.accuracy || 100} meters.
            Randomization is ${
                data.toggleRandomization ? "enabled" : "disabled"
            }.
        `.trim();
    }
});
