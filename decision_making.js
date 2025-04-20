// decision_making.js - Selects a website based on categories, history, and LLM sub-topic expansion

// Import dependencies
import { LLMService } from './llm_service.js'; // To get sub-topics
import { Memory } from './memory.js';       // To get API key and default categories

export const DecisionMaker = {

    /**
     * Chooses a website object based on user categories, site database, and history.
     * Optionally expands categories using LLM sub-topics if API key is available.
     * @param {string[]} baseCategories - User's selected categories.
     * @param {object} siteDatabase - The object containing { categories: [], sites: [] }.
     * @param {string[]} history - Array of recently visited URLs.
     * @returns {Promise<object>} An object { decision: object|null, reason: string, message?: string }
     * where decision is { url: string, category: string } or null.
     */
    async chooseWebsite(baseCategories, siteDatabase, history) { // Made async for LLM calls
        console.log("[DecisionMaking] Choosing website. Base Categories:", baseCategories, "History size:", history.length);

        let effectiveCategories = [...baseCategories]; // Start with user's preferences
        // Use a Set for efficient case-insensitive uniqueness checks during aggregation
        const lowerCaseEffectiveCategories = new Set(baseCategories.map(c => c.toLowerCase()));

        // --- LLM Enhancement for Sub-Topic Expansion ---
        const apiKey = await Memory.getApiKey(); // Get API key from memory

        // Attempt expansion only if API key and initial categories exist
        if (apiKey && baseCategories && baseCategories.length > 0) {
            console.log("[DecisionMaking] Attempting LLM sub-topic expansion for each category...");
            // Use Promise.all to call the LLM for all categories concurrently
            const subTopicPromises = baseCategories.map(category =>
                LLMService.getSubTopicsForCategory(apiKey, category)
                    .then(subTopics => ({ category, subTopics })) // Return subtopics with original category for logging
                    .catch(error => {
                         // Catch errors from individual LLM calls
                         console.error(`[DecisionMaking] Error getting subtopics for ${category}:`, error);
                         return { category, subTopics: [] }; // Return empty on error for this category
                    })
            );

            // Wait for all LLM calls to complete
            const results = await Promise.all(subTopicPromises);

            // Aggregate unique sub-topics
            results.forEach(({ category, subTopics }) => {
                // Check if subTopics is a valid array (not null or error string)
                if (subTopics && Array.isArray(subTopics) && subTopics.length > 0) {
                    console.log(`[DecisionMaking] LLM suggested sub-topics for "${category}":`, subTopics);
                    subTopics.forEach(subTopic => {
                        const lowerSubTopic = subTopic.toLowerCase();
                        // Add if it's not already in the set (case-insensitive)
                        if (!lowerCaseEffectiveCategories.has(lowerSubTopic)) {
                            effectiveCategories.push(subTopic); // Keep original casing
                            lowerCaseEffectiveCategories.add(lowerSubTopic); // Add lower for uniqueness check
                        }
                    });
                } else {
                     console.log(`[DecisionMaking] No valid sub-topics returned for "${category}".`);
                }
            });
            console.log("[DecisionMaking] Effective categories after expansion:", effectiveCategories);

        } else if (!apiKey) {
             console.log("[DecisionMaking] No API Key, skipping sub-topic expansion.");
        }
        // Ensure we have *some* categories to work with, falling back to defaults if needed
        if (effectiveCategories.length === 0) {
           console.warn("[DecisionMaking] Effective categories list is empty, falling back to defaults.");
           effectiveCategories = Memory.DEFAULT_CATEGORIES;
           // Update the set as well if falling back
           lowerCaseEffectiveCategories.clear();
           effectiveCategories.forEach(c => lowerCaseEffectiveCategories.add(c.toLowerCase()));
        }
        // --- End LLM Enhancement ---

        // Validate site database
        if (!siteDatabase || !siteDatabase.sites || siteDatabase.sites.length === 0) {
            console.error("[DecisionMaking] Website database is empty or invalid.");
            return { decision: null, reason: "error", message: "Website database unavailable." };
        }

        // 1. Filter sites by the potentially expanded list of effective categories (case-insensitive)
        console.log("[DecisionMaking] Filtering sites database using effective categories:", effectiveCategories);
        const relevantSites = siteDatabase.sites.filter(site => {
            const siteCategoryLower = site.category?.toLowerCase();
            // Check if the site's category matches any of the effective categories (base + sub-topics)
            return siteCategoryLower && lowerCaseEffectiveCategories.has(siteCategoryLower);
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
             potentialSite = availableSites[randomIndex]; // potentialSite is now {url, category}

             // Check if the selected URL is in the recent history
             if (!history.includes(potentialSite.url)) {
                 console.log(`[DecisionMaking] Selected non-recent site after ${attempts} attempt(s):`, potentialSite);
                 // Found a suitable site, return the full site object
                 return { decision: potentialSite, reason: "success" };
             } else {
                 console.log(`[DecisionMaking] Attempt ${attempts}: Site ${potentialSite.url} is in recent history. Retrying...`);
                 // Remove the chosen site from the available pool for the next attempt to guarantee progress
                 availableSites.splice(randomIndex, 1);
             }
        }

        // 3. If all attempts resulted in history hits OR the pool emptied, return the last potential site (if any)
        if (potentialSite) {
            console.log("[DecisionMaking] Could only find sites in recent history or exhausted options, returning last candidate:", potentialSite);
             // Return the full site object, indicating it might be from history
             return { decision: potentialSite, reason: "success_history" };
        } else {
             // This case implies all relevant sites were in history and removed from availableSites
             console.error("[DecisionMaking] Failed to select any site after filtering and history checks (Pool likely emptied or all sites in history).");
             return { decision: null, reason: "no_sites", message: "All relevant sites are in recent history." };
        }
    }
};
