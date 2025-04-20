// action.js - Performs the navigation action and updates history via Memory

// Import Memory module to add to history after navigation
import { Memory } from './memory.js';

export const Action = {

    /**
     * Navigates the specified tab to the given URL and updates the history.
     * @param {string} url - The URL to navigate to.
     * @param {number} tabId - The ID of the tab to navigate.
     * @returns {Promise<boolean>} True if navigation was initiated successfully, false otherwise.
     */
    async navigateToUrl(url, tabId) {
        // Validate inputs
        if (!url || typeof tabId !== 'number') {
            console.error("[Action] URL or Tab ID missing/invalid for navigation.", { url, tabId });
            return false;
        }
        console.log(`[Action] Navigating tab ${tabId} to URL: ${url}`);

        try {
            // Use chrome.tabs API to update the tab's URL
            await chrome.tabs.update(tabId, { url: url });
            console.log("[Action] Navigation initiated successfully.");

            // IMPORTANT: Add the URL to history *after* successfully initiating navigation
            // This assumes the navigation will likely succeed from Chrome's perspective.
            await Memory.addToHistory(url);

            return true; // Indicate success
        } catch (error) {
            // Log errors that might occur during navigation (e.g., invalid URL, tab closed)
            console.error(`[Action] Error navigating tab ${tabId} to ${url}:`, error);
            return false; // Indicate failure
        }
    }
};
