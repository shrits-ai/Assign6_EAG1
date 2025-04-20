// background.js - Orchestrates the Web Wanderer flow using the cognitive layers

// Import the layers
import { Memory } from './memory.js';
import { Perception } from './perception.js';
import { DecisionMaker } from './decision_making.js';
import { Action } from './action.js';

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
    console.log("BACKGROUND: Received message:", message, "from sender:", sender); // Log sender for debugging

    // Handle the request to start the "wander" process
    if (message.type === 'wanderRequest') {
        // --- MODIFICATION START ---
        // Instead of relying on sender.tab, query for the active tab directly.
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) {
                 console.error("BACKGROUND: Error querying active tab:", chrome.runtime.lastError);
                 sendResponse({ status: "error", message: "Could not get active tab." });
                 return;
            }
            if (tabs && tabs.length > 0) {
                const activeTab = tabs[0];
                console.log("BACKGROUND: Found active tab:", activeTab.id, activeTab.url);
                // Call the main handler function, passing the active tab info
                handleWanderRequest(activeTab, sendResponse);
            } else {
                // This case is unlikely but possible if no window is focused etc.
                console.error("BACKGROUND: No active tab found.");
                sendResponse({ status: "error", message: "No active tab identified." });
            }
        });
        // --- MODIFICATION END ---

        // Return true to indicate that sendResponse will be called asynchronously
        return true;
    }

    // Handle other potential message types here if needed in the future

});

// --- Core Handler Function ---

/**
 * Handles the wander request by orchestrating the cognitive layers.
 * @param {chrome.tabs.Tab} activeTab - The currently active tab object.
 * @param {function} sendResponse - Callback function to send results back to the popup.
 */
async function handleWanderRequest(activeTab, sendResponse) {
    console.log(`BACKGROUND: Handling wander request for active tab ${activeTab.id}...`);

    try {
        // 1. Perception Layer - Interpret the request and get intent (potentially using LLM)
        const userCategories = await Memory.getCategories(); // Get current categories first
        // Pass the message type, preferences are now just for context if LLM needed it
        const perceived = await Perception.interpretRequest({ type: 'wanderRequest' }, userCategories);

        // Check if perception was successful and the action is correct
        if (!perceived || perceived.action !== "WANDER") {
            console.error("BACKGROUND: Perception failed to interpret wander request.");
            sendResponse({ status: "error", message: "Could not interpret request." });
            return;
        }
        console.log("BACKGROUND: Perception interpreted intent:", perceived.intent);

        // 2. Memory Layer - Get necessary data (database and history)
        const siteDatabase = await Memory.getWebsiteDatabase();
        const history = await Memory.getHistory();

        // 3. Decision-Making Layer - Choose a website (potentially using LLM category expansion)
        const decisionResult = await DecisionMaker.chooseWebsite(userCategories, siteDatabase, history);
        const targetUrl = decisionResult.decision;

        // 4. Action Layer - Navigate the active tab or report back why not
        if (targetUrl) {
            // If a URL was decided, attempt navigation on the *active* tab
            const navigateSuccess = await Action.navigateToUrl(targetUrl, activeTab.id); // Use activeTab.id
            if (navigateSuccess) {
                // Report success back to the popup
                sendResponse({ status: "navigating", url: targetUrl });
            } else {
                // Report navigation error back to the popup
                sendResponse({ status: "error", message: "Failed to navigate tab." });
            }
        } else {
            // If no URL was decided, report the reason back to the popup
            console.warn(`BACKGROUND: No suitable site found. Reason: ${decisionResult.reason}`);
            sendResponse({
                status: decisionResult.reason || "error", // e.g., "no_sites", "error"
                message: decisionResult.message || "Could not find a suitable site."
            });
        }
    } catch (error) {
        // Catch any unexpected errors during the process
        console.error("BACKGROUND: Unexpected error during handleWanderRequest:", error);
        sendResponse({ status: "error", message: `An unexpected error occurred: ${error.message}` });
    }
}
