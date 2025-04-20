// action.js - Performs actions based on decisions. Navigation is no longer the primary action here.

// Import Memory module (still needed if we were adding history here, but moved to background.js)
// import { Memory } from './memory.js';

export const Action = {

    /**
     * (No longer used in main flow) Navigates the specified tab to the given URL.
     * History update is now handled in background.js after decision.
     * @param {string} url - The URL to navigate to.
     * @param {number} tabId - The ID of the tab to navigate.
     * @returns {Promise<boolean>} True if navigation was hypothetically initiated successfully, false otherwise.
     */
    async navigateToUrl(url, tabId) {
        // Validate inputs
        if (!url || typeof tabId !== 'number') {
            console.error("[Action] URL or Tab ID missing/invalid for navigation.", { url, tabId });
            return false;
        }
        console.log(`[Action] WOULD navigate tab ${tabId} to URL: ${url} (Navigation Disabled in current flow)`);

        /* // --- Navigation Disabled ---
        try {
            // Use chrome.tabs API to update the tab's URL
            // await chrome.tabs.update(tabId, { url: url });
            console.log("[Action] Navigation step skipped.");

            // History update moved to background.js after decision is made
            // await Memory.addToHistory(url);

            return true; // Indicate hypothetical success
        } catch (error) {
            console.error(`[Action] Error during hypothetical navigation for tab ${tabId} to ${url}:`, error);
            return false; // Indicate failure
        }
        */
       // Return false as navigation didn't happen in the current workflow
       return false;
    }

    // Could add other actions here in the future if needed
};
