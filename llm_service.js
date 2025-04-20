// llm_service.js - Handles communication with the LLM API (Google Gemini)

// Use a valid and current model name compatible with v1beta
const GEMINI_API_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=';

export const LLMService = {

    /**
     * Generic function to call the Gemini API.
     * @param {string} apiKey - The user's Google AI API key.
     * @param {string} prompt - The prompt to send to the LLM.
     * @returns {Promise<string|null>} The text response from the LLM, or null/error string.
     */
    async callGeminiAPI(apiKey, prompt) {
        if (!apiKey) {
            console.warn("[LLM Service] API Key not provided for LLM call.");
            return null;
        }
        console.log("[LLM Service] Calling Gemini API (Model: gemini-1.5-flash-latest)...");

        try {
            const response = await fetch(`${GEMINI_API_ENDPOINT_BASE}${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    safetySettings: [ // Standard safety settings
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    ],
                    // generationConfig: { temperature: 0.7 }
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error("[LLM Service] API Response Error Body:", errorBody);
                throw new Error(`API call failed with status ${response.status}: ${errorBody}`);
            }

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0 &&
                data.candidates[0].content?.parts?.length > 0) {
                console.log("[LLM Service] API Call successful.");
                return data.candidates[0].content.parts[0].text;
            } else {
                 console.warn("[LLM Service] Received unexpected or blocked response:", JSON.stringify(data));
                 if(data.promptFeedback?.blockReason) {
                     return `Blocked: ${data.promptFeedback.blockReason}`;
                 }
                 if (data.error) {
                     console.error("[LLM Service] API returned an error object:", data.error);
                     return `API Error: ${data.error.message}`;
                 }
                 return null;
            }
        } catch (error) {
            console.error("[LLM Service] Error calling Gemini API:", error);
            return `Error: ${error.message}`; // Return error message string
        }
    },

    /**
     * Uses the LLM to generate a simple interpretation of the user's intent.
     * @param {string} apiKey - The user's Google AI API key.
     * @param {string} messageType - The type of message received (e.g., 'wanderRequest').
     * @returns {Promise<string|null>} A short sentence describing the intent, or null/error message.
     */
    async interpretIntent(apiKey, messageType) {
        const prompt = `In one short sentence, describe the user's likely goal when initiating an action of type "${messageType}" in a web discovery browser extension.`;
        return await this.callGeminiAPI(apiKey, prompt);
    },

    /**
     * Uses the LLM to suggest sub-topics for a SINGLE given category.
     * @param {string} apiKey - The user's Google AI API key.
     * @param {string} category - The category to get sub-topics for.
     * @returns {Promise<string[]>} An array of suggested sub-topic strings, or an empty array.
     */
    async getSubTopicsForCategory(apiKey, category) {
        if (!category) return [];
        const prompt = `Suggest 2 or 3 specific sub-topics, related keywords, or examples for the main topic: "${category}". Important: List only the suggestions, separated by commas, with no introduction, explanation, or numbering.`;
        const result = await this.callGeminiAPI(apiKey, prompt);

        // Parse the comma-separated result, checking for errors/blocks
        if (result && !result.startsWith('Blocked:') && !result.startsWith('Error:') && !result.startsWith('API Error:')) {
            return result.split(',')
                   .map(s => s.trim())
                   .filter(Boolean);
        } else {
            console.warn(`[LLM Service] Sub-topic generation failed or was blocked for category "${category}". Result:`, result);
        }
        return [];
    }
};
