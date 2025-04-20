// perception.js - Identifies the user's intent/trigger, potentially using LLM

// Import dependencies
import { LLMService } from './llm_service.js';
import { Memory } from './memory.js';

export const Perception = {

    /**
     * Interprets the user's request, potentially enriching it with LLM analysis.
     * @param {object} message - The message received (e.g., from popup).
     * @param {string[]} preferences - User's current category preferences (passed for context).
     * @returns {Promise<object|null>} An object representing the perceived action and intent, or null.
     */
    async interpretRequest(message, preferences) { // Made async to allow await for LLM
        console.log("[Perception] Interpreting request:", message);

        // Default interpretation without LLM
        let perceivedIntent = "User triggered 'Wander' action.";

        // --- LLM Enhancement for Intent Interpretation ---
        const apiKey = await Memory.getApiKey(); // Fetch API key from memory

        // Only call LLM if API key exists and it's the relevant message type
        if (apiKey && message.type === 'wanderRequest') {
            console.log("[Perception] Attempting LLM intent interpretation...");
            try {
                // Call the LLM service to interpret intent
                const llmInterpretation = await LLMService.interpretIntent(apiKey, message.type);

                // Use the LLM result if valid and not blocked/error
                if (llmInterpretation && !llmInterpretation.startsWith('Blocked:') && !llmInterpretation.startsWith('Error:') && !llmInterpretation.startsWith('API Error:')) {
                    perceivedIntent = llmInterpretation.trim(); // Use LLM interpretation
                    console.log("[Perception] LLM interpretation result:", perceivedIntent);
                } else {
                     // Log if LLM failed but keep default intent
                     console.warn("[Perception] LLM intent interpretation failed, was blocked, or returned error:", llmInterpretation);
                }
            } catch (error) {
                console.error("[Perception] Error during LLM intent interpretation:", error);
                // Keep the default intent on error
            }
        } else if (!apiKey && message.type === 'wanderRequest') {
             console.log("[Perception] No API Key found, skipping LLM interpretation.");
        }
        // --- End LLM Enhancement ---

        // Check if the message type is the one we handle
        if (message.type === 'wanderRequest') {
            // Return the structured perception result
            return {
                action: "WANDER",       // The identified action
                intent: perceivedIntent // The interpreted intent (default or from LLM)
            };
        }

        // Return null if the message type is not recognized or handled
        console.warn("[Perception] Received unhandled message type:", message?.type);
        return null;
    }
};
