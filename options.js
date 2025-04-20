// Handles saving and loading the optional API key

const optionsForm = document.getElementById('options-form');
const statusDiv = document.getElementById('status');

// Load saved API Key
function loadOptions() {
    // Only load API key now
    chrome.storage.sync.get(['wandererApiKey'], (data) => {
        if (chrome.runtime.lastError) {
            console.error("Error loading options:", chrome.runtime.lastError);
            statusDiv.textContent = 'Error loading settings.';
            return;
        }
        // Load API Key
        document.getElementById('apiKey').value = data.wandererApiKey || '';
        console.log('Wanderer options loaded (API Key only).');
    });
}

// Save API Key
function saveOptions(event) {
    event.preventDefault(); // Prevent form submission

    // Save API Key
    const apiKey = document.getElementById('apiKey').value.trim();

    // Save only the API key setting
    chrome.storage.sync.set({
        wandererApiKey: apiKey // Save the API key
    }, () => {
        if (chrome.runtime.lastError) {
            console.error("Error saving options:", chrome.runtime.lastError);
            statusDiv.textContent = 'Error saving settings.';
        } else {
            console.log('Wanderer options saved (API key presence):', apiKey ? '***' : 'Not Set');
            statusDiv.textContent = 'Settings saved!';
            setTimeout(() => { statusDiv.textContent = ''; }, 3000);
        }
    });
}

// Add event listeners
document.addEventListener('DOMContentLoaded', loadOptions);
optionsForm.addEventListener('submit', saveOptions);
