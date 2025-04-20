// decision_making.js - Selects a website based on categories, history, and LLM expansion

// Import dependencies
import { LLMService } from './llm_service.js'; // To expand categories
import { Memory } from './memory.js';       // To get API key and default categories

export const DecisionMaker = {

    /**
     * Chooses a website URL based on user categories, site database, and history.
     * Optionally expands categories using LLM if API key is available.
     * @param {string[]} categories - User's selected categories.
     * @param {object} siteDatabase - The object containing { categories: [], sites: [] }.
     * @param {string[]} history - Array of recently visited URLs.
     * @returns {Promise<object>} An object { decision: string|null, reason: string, message?: string }
     */
    async chooseWebsite(categories, siteDatabase, history) { // Made async for LLM call
        console.log("[DecisionMaking] Choosing website. Base Categories:", categories, "History size:", history.length);

        let effectiveCategories = [...categories]; // Start with user's preferences

        // --- LLM Enhancement for Category Expansion ---
        const apiKey = await Memory.getApiKey(); // Get API key from memory

        // Attempt expansion only if API key and initial categories exist
        if (apiKey && categories && categories.length > 0) {
            console.log("[DecisionMaking] Attempting LLM category expansion...");
            try {
                // Call LLM service to get related categories
                const expandedCats = await LLMService.expandCategories(apiKey, categories);
                if (expandedCats && expandedCats.length > 0) {
                    console.log("[DecisionMaking] LLM suggested categories:", expandedCats);
                    // Add unique suggested categories to the effective list
                    expandedCats.forEach(cat => {
                        // Add case-insensitively for broader matching later
                        const lowerCat = cat.toLowerCase();
                        if (!effectiveCategories.some(ec => ec.toLowerCase() === lowerCat)) {
                            effectiveCategories.push(cat); // Keep original casing for potential display
                        }
                    });
                    console.log("[DecisionMaking] Effective categories after expansion:", effectiveCategories);
                } else {
                     console.warn("[DecisionMaking] LLM category expansion returned no results or was blocked.");
                }
            } catch (error) {
                console.error("[DecisionMaking] Error during LLM category expansion:", error);
            }
        } else if (!apiKey) {
             console.log("[DecisionMaking] No API Key, skipping category expansion.");
        }
        // Ensure we have *some* categories to work with, falling back to defaults if needed
        if (effectiveCategories.length === 0) {
           console.warn("[DecisionMaking] Effective categories list is empty, falling back to defaults.");
           effectiveCategories = Memory.DEFAULT_CATEGORIES;
        }
        // --- End LLM Enhancement ---

        // Validate site database
        if (!siteDatabase || !siteDatabase.sites || siteDatabase.sites.length === 0) {
            console.error("[DecisionMaking] Website database is empty or invalid.");
            return { decision: null, reason: "error", message: "Website database unavailable." };
        }

        // 1. Filter sites by the potentially expanded list of effective categories
        const relevantSites = siteDatabase.sites.filter(site => {
            // Check if the site's category (case-insensitive) is included in the effective categories (case-insensitive)
            const siteCategoryLower = site.category?.toLowerCase();
            return siteCategoryLower && effectiveCategories.some(effCat => effCat.toLowerCase() === siteCategoryLower);
        });

        // Check if any relevant sites were found
        if (relevantSites.length === 0) {
            console.warn("[DecisionMaking] No sites found matching effective categories:", effectiveCategories);
            // Report back that no sites were found for the given criteria
            return { decision: null, reason: "no_sites" };
        }
        console.log(`[DecisionMaking] Found ${relevantSites.length} sites matching effective categories.`);

        // 2. Filter out recent history, attempting to find a novel site
        let potentialSite = null;
        let attempts = 0;
        const maxAttempts = 5; // Try a few times to avoid picking from history

        // Create a mutable copy for potential removal during retry attempts
        let availableSites = [...relevantSites];

        while (attempts < maxAttempts && availableSites.length > 0) {
             attempts++;
             // Select a random site from the currently available list
             const randomIndex = Math.floor(Math.random() * availableSites.length);
             potentialSite = availableSites[randomIndex];

             // Check if the selected URL is in the recent history
             if (!history.includes(potentialSite.url)) {
                 console.log(`[DecisionMaking] Selected non-recent site after ${attempts} attempt(s):`, potentialSite.url);
                 // Found a suitable site, return the URL
                 return { decision: potentialSite.url, reason: "success" };
             } else {
                 console.log(`[DecisionMaking] Attempt ${attempts}: Site ${potentialSite.url} is in recent history. Retrying...`);
                 // Remove the chosen site from the available pool for the next attempt to guarantee progress
                 availableSites.splice(randomIndex, 1);
             }
        }

        // 3. If all attempts resulted in history hits OR the pool emptied, return the last potential site (if any)
        if (potentialSite) {
            console.log("[DecisionMaking] Could only find sites in recent history or exhausted options, returning last candidate:", potentialSite.url);
             // Return the URL, indicating it might be from history
             return { decision: potentialSite.url, reason: "success_history" };
        } else {
             // This case should ideally not be reached if relevantSites was initially > 0
              console.error("[DecisionMaking] Failed to select any site after filtering and history checks.");
              return { decision: null, reason: "error", message: "Selection failed after filtering." };
        }
    }
};
