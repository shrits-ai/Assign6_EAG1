const wanderButton = document.getElementById('wander-button');
const statusDiv = document.getElementById('status');
const categoriesForm = document.getElementById('categories-form');
const categoriesContainer = document.getElementById('categories-container');
const optionsLink = document.getElementById('options-link');
const resultLinkArea = document.getElementById('result-link-area');
const resultLink = document.getElementById('result-link');
const resultCategory = document.getElementById('result-category');

// Define default categories here, should match memory.js
const defaultCategories = ["Art", "Science", "Funny"];

/**
 * Loads saved categories from storage and updates checkboxes.
 */
function loadCategories() {
    statusDiv.textContent = "Loading settings...";
    resultLinkArea.style.display = 'none'; // Hide result area on load
    chrome.storage.sync.get('wandererCategories', (data) => {
        if (chrome.runtime.lastError) {
            console.error("Error loading categories:", chrome.runtime.lastError);
            statusDiv.textContent = 'Error loading settings.';
            populateCheckboxes(defaultCategories); // Use defaults if loading fails
            return;
        }
        const savedCategories = data.wandererCategories || defaultCategories;
        populateCheckboxes(savedCategories);
        statusDiv.textContent = "Select categories and find a site!"; // Ready state
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
function findSite() { // Renamed from saveAndWander
    statusDiv.textContent = 'Saving preferences...';
    resultLinkArea.style.display = 'none'; // Hide previous result
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
            statusDiv.textContent = 'Finding a site...';
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
        // Re-enable button once response is received
        wanderButton.disabled = false;

        // Handle response from background script
        if (chrome.runtime.lastError) {
            console.error("POPUP Error:", chrome.runtime.lastError.message);
            statusDiv.textContent = `Error: ${chrome.runtime.lastError.message}`;
        } else if (response) {
            console.log("POPUP: Received response from background:", response);
            // Update UI based on background script's status report
            if (response.status === 'success' && response.site) {
                // Display the link
                statusDiv.textContent = 'Found a site!';
                resultLink.href = response.site.url;
                // Display URL, truncate if very long for display purposes
                let displayText = response.site.url;
                if (displayText.length > 50) {
                    displayText = displayText.substring(0, 47) + '...';
                }
                resultLink.textContent = displayText;
                resultLink.title = response.site.url; // Show full URL on hover
                resultCategory.textContent = `Category: ${response.site.category || 'Unknown'}`;
                resultLinkArea.style.display = 'block'; // Show the result area
            } else if (response.status === 'error') {
                 statusDiv.textContent = `Error: ${response.message}`;
                 resultLinkArea.style.display = 'none'; // Hide result area on error
            } else if (response.status === 'no_sites') {
                 statusDiv.textContent = "No sites found for these categories.";
                 resultLinkArea.style.display = 'none'; // Hide result area
            } else if (response.status === 'no_prefs') {
                 statusDiv.textContent = "Error: Categories not set.";
                 resultLinkArea.style.display = 'none'; // Hide result area
            } else {
                 statusDiv.textContent = 'Unexpected response from background.';
                 resultLinkArea.style.display = 'none'; // Hide result area
            }
        } else {
             statusDiv.textContent = 'No response from background.';
             resultLinkArea.style.display = 'none'; // Hide result area
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
      // Fallback for browsers that might not support openOptionsPage
      window.open(chrome.runtime.getURL('options.html'));
    }
}

// --- Event Listeners ---
// Load categories when the popup is opened
document.addEventListener('DOMContentLoaded', loadCategories);
// Handle the main button click ("Find a Site!")
wanderButton.addEventListener('click', findSite);
// Handle the options link click (gear icon)
optionsLink.addEventListener('click', openOptionsPage);
