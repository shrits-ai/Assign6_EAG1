// llm_service.js - Handles calls to Gemini API for puzzle generation and evaluation
// Added check to ensure askedHistory is an array before using .map().

const GEMINI_API_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=';
const API_TIMEOUT_MS = 30000;

export const LLMService = {

    /**
     * Generic function to call the Gemini API.
     */
    async callGeminiAPI(apiKey, conversationHistory) {
        // ... (Keep the robust callGeminiAPI function from previous version - ID: llm_puzzle_llm_service_js_multiple) ...
        if (!apiKey) { return "Error: API Key not set."; }
        if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) { return "Error: Invalid conversation history."; }
        console.log("[LLM Service] Calling Gemini API (Model: gemini-1.5-flash-latest) with history:", conversationHistory);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => { controller.abort(); }, API_TIMEOUT_MS);
        try {
            const response = await fetch(`${GEMINI_API_ENDPOINT_BASE}${apiKey}`, { /* ... fetch options ... */ signal: controller.signal, method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({contents: conversationHistory, generationConfig: { temperature: 0.9 }, safetySettings: [ { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }, ]}) , cache: 'no-store'});
            clearTimeout(timeoutId);
            let data; try { data = await response.json(); console.log("[LLM Service] Raw API Response:", JSON.stringify(data).substring(0, 500) + "..."); } catch (jsonError) { console.error("[LLM Service] Failed to parse API response as JSON:", jsonError); if (!response.ok) { throw new Error(`API call failed with status ${response.status} - ${response.statusText}. Response body was not valid JSON.`); } throw new Error(`API call succeeded (status ${response.status}) but failed to parse JSON response.`); }
            if (!response.ok) { const detail = data?.error?.message || `Status ${response.status}`; throw new Error(`API call failed: ${detail}`); }
            if (data.promptFeedback?.blockReason) { return `Blocked: ${data.promptFeedback.blockReason}`; }
            if (data.candidates?.[0]?.finishReason && data.candidates[0].finishReason !== "STOP") { return `Response stopped: ${data.candidates[0].finishReason}`; }
            const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textContent) { return textContent; } else { return "Error: Received empty response from AI."; }
        } catch (error) { /* ... error handling ... */ clearTimeout(timeoutId); if (error.name === 'AbortError') { return `Error: API call timed out after ${API_TIMEOUT_MS / 1000} seconds.`; } console.error("[LLM Service] Error calling Gemini API:", error); return `Error: ${error.message}`; }
    },

    /**
     * Asks LLM to generate MULTIPLE puzzles different from history, then picks one.
     * @param {string} apiKey
     * @param {'Easy'|'Medium'|'Hard'} difficulty
     * @param {string[]} [askedHistory=[]] - Array of recently asked question strings.
     * @returns {Promise<{question: string, answer: string}|null>} Object with ONE selected question/answer or null on error.
     */
    async generatePuzzle(apiKey, difficulty, askedHistory = []) { // Default askedHistory to empty array

        let historyString = "None";
        // --- Added Check: Ensure askedHistory is an array before using .map ---
        if (Array.isArray(askedHistory) && askedHistory.length > 0) {
            console.log("[LLM Service] Formatting puzzle history for prompt:", askedHistory);
            try {
                 // Only call map if it's definitely an array
                historyString = askedHistory.map((q, i) => `${i+1}. ${q}`).join('\n');
            } catch (mapError) {
                 console.error("[LLM Service] Error during askedHistory.map:", mapError, "History data:", askedHistory);
                 historyString = "Error formatting history"; // Fallback
            }
        } else {
            // Log if history is not a valid array or empty
            console.log("[LLM Service] No valid puzzle history provided or history is empty.");
        }
        // --- End Added Check ---


        const timestamp = Date.now();
        const prompt = `Generate 3 different short, engaging puzzles or questions (any type like trivia, riddle, logic, math, word puzzle, unless type specified) suitable for an ${difficulty} difficulty level.
IMPORTANT: Ensure the generated questions are significantly different from the following recently asked questions:
--- RECENT HISTORY ---
${historyString}
--- END HISTORY ---
Request ID: ${timestamp}

Format the output *exactly* like this, with each puzzle separated by '---':
Question: [Question 1 text]
Answer: [Answer 1 text]
---
Question: [Question 2 text]
Answer: [Answer 2 text]
---
Question: [Question 3 text]
Answer: [Answer 3 text]`;

        const historyForLLM = [{ role: 'user', parts: [{ text: prompt }] }];
        const result = await this.callGeminiAPI(apiKey, historyForLLM);

        if (result && !result.startsWith('Error:') && !result.startsWith('Blocked:')) {
            // --- Parsing Logic (same as before) ---
            const puzzles = [];
            const puzzleBlocks = result.split('---');
            for (const block of puzzleBlocks) { /* ... parse block ... */
                 if (block.trim() === '') continue;
                 const questionMatch = block.match(/Question:\s*(.*)/i);
                 const answerMatch = block.match(/Answer:\s*(.*)/i);
                 if (questionMatch?.[1] && answerMatch?.[1]) { puzzles.push({ question: questionMatch[1].trim(), answer: answerMatch[1].trim() }); }
                 else { console.warn("[LLM Service] Could not parse Q&A format in block:", block.trim()); }
             }

            if (puzzles.length > 0) { /* ... randomly select and return one ... */
                 const randomIndex = Math.floor(Math.random() * puzzles.length);
                 console.log(`[LLM Service] Parsed ${puzzles.length} puzzles, randomly selected index ${randomIndex}.`);
                 return puzzles[randomIndex];
             } else { /* ... handle parsing failure ... */ console.error("[LLM Service] Failed to parse any valid Q&A pairs from LLM response:", result); return null; }
        }
        console.error("[LLM Service] Puzzle generation failed or was blocked:", result);
        return null;
    },

    /**
     * Asks LLM to evaluate if the user's answer is correct.
     * (No changes needed here)
     */
    async evaluateAnswer(apiKey, question, userAnswer, correctAnswer) {
        // ... (Keep the existing evaluateAnswer function code from llm_puzzle_llm_service_js_multiple) ...
        const prompt = `Question: ${question}\nCorrect Answer: ${correctAnswer}\nUser's Answer: ${userAnswer}\n\nIs the user's answer correct or a very close match/synonym for the correct answer? Consider potential typos or minor phrasing differences.\nRespond ONLY with the single word 'CORRECT' (all caps) if it is correct/close enough.\nRespond ONLY with the single word 'INCORRECT' (all caps) if it is wrong.`;
        const history = [{ role: 'user', parts: [{ text: prompt }] }];
        const result = await this.callGeminiAPI(apiKey, history);
        if (result && typeof result === 'string') { const evaluation = result.trim().toUpperCase(); if (evaluation === 'CORRECT') return 'Correct'; if (evaluation === 'INCORRECT') return 'Incorrect'; console.warn("[LLM Service] Evaluation response was not exactly 'CORRECT' or 'INCORRECT':", result); if (evaluation.includes('CORRECT')) return 'Correct'; if (evaluation.includes('INCORRECT')) return 'Incorrect'; }
        console.error("[LLM Service] Answer evaluation failed or returned unexpected result:", result); return 'Error';
    }
};
