// llm_service.js - Handles communication with the LLM API (Google Gemini)

// Gemini API endpoint (consider using gemini-1.5-flash for potentially faster/cheaper responses)
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=';

export const LLMService = {

    /**
     * Generic function to call the Gemini API.
     * @param {string} apiKey - The user's Google AI API key.
     * @param {string} prompt - The prompt to send to the LLM.
     * @returns {Promise<string|null>} The text response from the LLM, or null on error/block.
     */
    async callGeminiAPI(apiKey, prompt) {
        // Check if API key is provided
        if (!apiKey) {
            console.warn("[LLM Service] API Key not provided for LLM call.");
            return null;
        }
        console.log("[LLM Service] Calling Gemini API...");

        try {
            // Make the API request using fetch
            const response = await fetch(`${GEMINI_API_ENDPOINT}${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    // Structure the request payload for Gemini API
                    contents: [{ parts: [{ text: prompt }] }],
                    // Define safety settings to block harmful content
                    safetySettings: [
                        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                    ],
                    // Optional: Configure generation parameters like temperature
                    // generationConfig: { temperature: 0.7 }
                }),
            });

            // Check if the API call was successful
            if (!response.ok) {
                const errorBody = await response.text(); // Get error details if available
                throw new Error(`API call failed with status ${response.status}: ${errorBody}`);
            }

            // Parse the JSON response
            const data = await response.json();

            // Extract the text content from the response, handling potential blocks
            if (data.candidates && data.candidates.length > 0 &&
                data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
                // Successfully got a text response
                console.log("[LLM Service] API Call successful.");
                return data.candidates[0].content.parts[0].text;
            } else {
                 // Handle cases where content might be blocked or response is empty
                 console.warn("[LLM Service] Received unexpected or blocked response:", JSON.stringify(data));
                 if(data.promptFeedback?.blockReason) {
                     // Log the reason if content was blocked by safety settings
                     return `Blocked: ${data.promptFeedback.blockReason}`;
                 }
                 return null; // Return null if no valid text part found
            }

        } catch (error) {
            // Log any errors during the API call
            console.error("[LLM Service] Error calling Gemini API:", error);
            return null; // Return null on error
        }
    },

    /**
     * Uses the LLM to generate a simple interpretation of the user's intent.
     * @param {string} apiKey - The user's Google AI API key.
     * @param {string} messageType - The type of message received (e.g., 'wanderRequest').
     * @returns {Promise<string|null>} A short sentence describing the intent, or null.
     */
    async interpretIntent(apiKey, messageType) {
        // Simple prompt for the LLM
        const prompt = `In one short sentence, describe the user's likely goal when initiating an action of type "${messageType}" in a web discovery browser extension.`;
        return await this.callGeminiAPI(apiKey, prompt);
    },

    /**
     * Uses the LLM to suggest related categories based on the user's selection.
     * @param {string} apiKey - The user's Google AI API key.
     * @param {string[]} categories - An array of the user's selected categories.
     * @returns {Promise<string[]>} An array of suggested related category strings, or an empty array.
     */
    async expandCategories(apiKey, categories) {
        // Don't call if no base categories are provided
        if (!categories || categories.length === 0) return [];

        // Prompt LLM to suggest related topics/keywords
        const prompt = `The user likes these topics: ${categories.join(', ')}. Suggest exactly 3 related topics, keywords, or synonyms useful for finding similar websites. Important: List only the 3 suggested topics, separated by commas, with no introduction or explanation.`;
        const result = await this.callGeminiAPI(apiKey, prompt);

        // Parse the comma-separated result from the LLM
        if (result && !result.startsWith('Blocked:')) {
            return result.split(',')          // Split by comma
                   .map(s => s.trim())      // Trim whitespace
                   .filter(Boolean);       // Remove empty strings
        }
        // Return empty array if LLM call failed, was blocked, or returned nothing useful
        return [];
    }
};
