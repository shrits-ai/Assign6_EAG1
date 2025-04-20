const wanderButton = document.getElementById('wander-button');
const statusDiv = document.getElementById('status');
const categoriesForm = document.getElementById('categories-form');
const categoriesContainer = document.getElementById('categories-container');
const optionsLink = document.getElementById('options-link');

// Define default categories here, should match memory.js
const defaultCategories = ["Art", "Science", "Funny"];

/**
 * Loads saved categories from storage and updates checkboxes.
 */
function loadCategories() {
    statusDiv.textContent = "Loading settings...";
    chrome.storage.sync.get('wandererCategories', (data) => {
        if (chrome.runtime.lastError) {
            console.error("Error loading categories:", chrome.runtime.lastError);
            statusDiv.textContent = 'Error loading settings.';
            // Still try to use defaults if loading fails
            populateCheckboxes(defaultCategories);
            return;
        }
        const savedCategories = data.wandererCategories || defaultCategories;
        populateCheckboxes(savedCategories);
        statusDiv.textContent = "Select categories and wander!"; // Ready state
        console.log('Popup loaded categories:', savedCategories);
    });
}

/**
 * Populates the checkboxes based on the provided category list.
 * @param {string[]} activeCategories - List of categories that should be checked.
 */
function populateCheckboxes(activeCategories) {
    const checkboxes = categoriesContainer.querySelectorAll('input[name="categories"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = activeCategories.includes(checkbox.value);
    });
}

/**
 * Saves the currently selected categories and then triggers the wander request.
 */
function saveAndWander() {
    statusDiv.textContent = 'Saving preferences...';
    wanderButton.disabled = true; // Disable button

    // Get selected categories from checkboxes
    const selectedCategories = Array.from(categoriesContainer.querySelectorAll('input[name="categories"]:checked'))
                                .map(cb => cb.value);

    // Ensure at least defaults are selected if user unchecks all
    const categoriesToSave = selectedCategories.length > 0 ? selectedCategories : defaultCategories;

    // Save the selected categories to storage
    chrome.storage.sync.set({ wandererCategories: categoriesToSave }, () => {
        if (chrome.runtime.lastError) {
            console.error("Error saving categories:", chrome.runtime.lastError);
            statusDiv.textContent = 'Error saving settings.';
            wanderButton.disabled = false; // Re-enable button on error
        } else {
            console.log('Popup saved categories:', categoriesToSave);
            statusDiv.textContent = 'Settings saved! Wandering...';
            // Categories saved successfully, NOW send the wander request
            triggerWanderRequest();
        }
    });
}

/**
 * Sends the wander request message to the background script.
 */
function triggerWanderRequest() {
    console.log("POPUP: Sending wanderRequest message to background.");
    chrome.runtime.sendMessage({ type: 'wanderRequest' }, (response) => {
        // Handle response from background script
        if (chrome.runtime.lastError) {
            console.error("POPUP Error:", chrome.runtime.lastError.message);
            statusDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
            wanderButton.disabled = false; // Re-enable on error
        } else if (response) {
            console.log("POPUP: Received response from background:", response);
            // Update UI based on background script's status report
            if (response.status === 'navigating') {
                statusDiv.textContent = `Navigating...`;
                // Close popup shortly after navigation starts
                setTimeout(() => window.close(), 1000);
            } else if (response.status === 'error') {
                 statusDiv.textContent = `Error: ${response.message}`;
                 wanderButton.disabled = false; // Re-enable on error
            } else if (response.status === 'no_sites') {
                 statusDiv.textContent = "No sites found for these categories.";
                 wanderButton.disabled = false;
            } else if (response.status === 'no_prefs') {
                 // This shouldn't happen now as we save defaults, but handle defensively
                 statusDiv.textContent = "Error: Categories not set.";
                 wanderButton.disabled = false;
            } else {
                 statusDiv.textContent = 'Unexpected response.';
                 wanderButton.disabled = false;
            }
        } else {
             statusDiv.textContent = 'No response from background.';
             wanderButton.disabled = false;
        }
    });
}

/**
 * Opens the extension's options page.
 */
function openOptionsPage(event) {
    event.preventDefault(); // Prevent default link behavior
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
}

// --- Event Listeners ---
// Load categories when the popup is opened
document.addEventListener('DOMContentLoaded', loadCategories);
// Handle the main button click
wanderButton.addEventListener('click', saveAndWander);
// Handle the options link click
optionsLink.addEventListener('click', openOptionsPage);
