// Handles saving and loading the API key

const optionsForm = document.getElementById('options-form');
const statusDiv = document.getElementById('status');
const API_KEY_STORAGE_KEY = 'llmPuzzleApiKey'; // Use a specific key

// Load saved API Key
function loadOptions() {
    chrome.storage.sync.get([API_KEY_STORAGE_KEY], (data) => {
        if (chrome.runtime.lastError) {
            console.error("Error loading options:", chrome.runtime.lastError);
            statusDiv.textContent = 'Error loading settings.';
            return;
        }
        document.getElementById('apiKey').value = data[API_KEY_STORAGE_KEY] || '';
        console.log('LLM Puzzle options loaded.');
    });
}

// Save API Key
function saveOptions(event) {
    event.preventDefault();
    const apiKey = document.getElementById('apiKey').value.trim();

    chrome.storage.sync.set({ [API_KEY_STORAGE_KEY]: apiKey }, () => {
        if (chrome.runtime.lastError) {
            console.error("Error saving options:", chrome.runtime.lastError);
            statusDiv.textContent = 'Error saving settings.';
        } else {
            console.log('LLM Puzzle options saved (API key presence):', apiKey ? '***' : 'Not Set');
            statusDiv.textContent = 'Settings saved!';
            setTimeout(() => { statusDiv.textContent = ''; }, 3000);
        }
    });
}

// Add event listeners
document.addEventListener('DOMContentLoaded', loadOptions);
optionsForm.addEventListener('submit', saveOptions);
