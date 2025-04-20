// background.js - Orchestrates the Web Wanderer flow using the cognitive layers

// Import the layers
import { Memory } from './memory.js';
import { Perception } from './perception.js';
import { DecisionMaker } from './decision_making.js';
import { Action } from './action.js'; // Action layer is now minimal for this flow

console.log("Web Wanderer: Background service worker started.");

// --- Event Listeners ---

// On extension install/update
chrome.runtime.onInstalled.addListener(details => {
    console.log("Web Wanderer installed or updated:", details.reason);
    // Optionally pre-fetch the website database on install to cache it
    Memory.getWebsiteDatabase().then(() => {
        console.log("Initial website database fetch/cache attempt complete.");
    });
});

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("BACKGROUND: Received message:", message, "from sender:", sender);

    // Handle the request to start the "wander" process
    if (message.type === 'wanderRequest') {
        // Query for the active tab when the request comes in
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            // Handle potential errors during tab query
            if (chrome.runtime.lastError) {
                 console.error("BACKGROUND: Error querying active tab:", chrome.runtime.lastError);
                 sendResponse({ status: "error", message: "Could not get active tab." });
                 return; // Stop execution if tab query fails
            }
            // Check if any active tabs were found
            if (tabs && tabs.length > 0) {
                const activeTab = tabs[0];
                console.log("BACKGROUND: Found active tab:", activeTab.id, activeTab.url);
                // Call the main handler function, passing the active tab info
                handleWanderRequest(activeTab, sendResponse);
            } else {
                // Handle case where no active tab is found
                console.error("BACKGROUND: No active tab found.");
                sendResponse({ status: "error", message: "No active tab identified." });
            }
        });
        // Return true to indicate that sendResponse will be called asynchronously
        return true;
    }

    // Handle other potential message types here if needed in the future

});

// --- Core Handler Function ---

/**
 * Handles the wander request by orchestrating the cognitive layers.
 * Sends the chosen site link back to the popup instead of navigating.
 * @param {chrome.tabs.Tab} activeTab - The currently active tab object (provides context).
 * @param {function} sendResponse - Callback function to send results back to the popup.
 */
async function handleWanderRequest(activeTab, sendResponse) {
    console.log(`BACKGROUND: Handling wander request (origin tab ${activeTab.id})...`);

    try {
        // 1. Perception Layer - Interpret the request and get intent (potentially using LLM)
        const userCategories = await Memory.getCategories(); // Get current categories first
        // Pass the message type; preferences are used internally by LLM if needed
        const perceived = await Perception.interpretRequest({ type: 'wanderRequest' }, userCategories);

        // Check if perception was successful and the action is correct
        if (!perceived || perceived.action !== "WANDER") {
            console.error("BACKGROUND: Perception failed to interpret wander request.");
            sendResponse({ status: "error", message: "Could not interpret request." });
            return; // Stop if perception fails
        }
        console.log("BACKGROUND: Perception interpreted intent:", perceived.intent);

        // 2. Memory Layer - Get necessary data (database and history)
        const siteDatabase = await Memory.getWebsiteDatabase();
        const history = await Memory.getHistory();

        // 3. Decision-Making Layer - Choose a website (potentially using LLM category expansion)
        const decisionResult = await DecisionMaker.chooseWebsite(userCategories, siteDatabase, history);
        const chosenSite = decisionResult.decision; // This is now {url, category} or null

        // 4. Action Layer (Minimal) & Response Generation
        if (chosenSite && chosenSite.url) {
            // Successfully decided on a site
            console.log(`BACKGROUND: Site chosen: ${chosenSite.url} (Category: ${chosenSite.category})`);

            // Add to history *after* deciding, before sending response
            // This prevents the same site being immediately suggested again
            await Memory.addToHistory(chosenSite.url);

            // Send the chosen site object back to the popup
            sendResponse({ status: "success", site: chosenSite });

            // --- Navigation is NOT performed here ---
            // const navigateSuccess = await Action.navigateToUrl(targetUrl, activeTab.id);

        } else {
            // If no URL was decided (e.g., no matching sites, all in history), report the reason back
            console.warn(`BACKGROUND: No suitable site found. Reason: ${decisionResult.reason}`);
            sendResponse({
                status: decisionResult.reason || "error", // Use reason from decision maker (e.g., "no_sites")
                message: decisionResult.message || "Could not find a suitable site." // Provide message if available
            });
        }
    } catch (error) {
        // Catch any unexpected errors during the entire process
        console.error("BACKGROUND: Unexpected error during handleWanderRequest:", error);
        sendResponse({ status: "error", message: `An unexpected error occurred: ${error.message}` });
    }
}
