// popup.js - User9684

// This javascript file handles the input from the extension popup, along with
// rendering pre-existing data.

document.addEventListener("DOMContentLoaded", () => {
    const latitudeInput = document.getElementById("latitude");
    const longitudeInput = document.getElementById("longitude");
    const accuracyInput = document.getElementById("accuracy");
    const enabledToggle = document.getElementById("enabled");
    const randomizationToggle = document.getElementById("toggleRandomization");
    const statusDisplay = document.getElementById("status");

    chrome.storage.local.get(
        ["latitude", "longitude", "accuracy", "toggleRandomization", "enabled"],
        (data) => {
            latitudeInput.value = data.latitude || "N/A";
            longitudeInput.value = data.longitude || "N/A";
            accuracyInput.value = data.accuracy || 100;
            enabledToggle.checked = data.enabled || false;
            randomizationToggle.checked = data.toggleRandomization || false;
            updateStatus();
        }
    );

    enabledToggle.addEventListener("change", () => {
        chrome.storage.local.set({ enabled: enabledToggle.checked }, () => {
            updateStatus();
        });
    });

    randomizationToggle.addEventListener("change", () => {
        chrome.storage.local.set(
            { toggleRandomization: randomizationToggle.checked },
            () => {
                updateStatus();
            }
        );
    });

    document.getElementById("confirmData").addEventListener("click", () => {
        const latitudeValue = parseFloat(latitudeInput.value);
        const longitudeValue = parseFloat(longitudeInput.value);
        const accuracyValue = parseInt(accuracyInput.value);

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
            },
            () => {
                alert("Location and accuracy set successfully!");
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

        statusDisplay.textContent = `
            Spoofer is ${data.enabled ? "enabled" : "disabled"}.
            Current Location: ${data.latitude || "N/A"}, ${data.longitude || "N/A"}.
            Accuracy: ${data.accuracy || 100} meters.
            Randomization is ${data.toggleRandomization ? "enabled" : "disabled"}.
        `.trim();
    }
});
