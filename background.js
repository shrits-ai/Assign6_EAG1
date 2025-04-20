// background.js - Orchestrates the LLM Puzzle Break using 4 Layers + History + Score + Types

import { Memory } from './memory.js';
import { PuzzlePerception } from './puzzle_perception.js';
import { PuzzleDecisionMaker } from './puzzle_decision_making.js';
import { PuzzleAction } from './puzzle_action.js';
// LLMService is used by the Action layer

console.log("LLM Puzzle Break: Background service worker started (4-Layer + History + Score + Types).");

chrome.runtime.onInstalled.addListener(details => {
    console.log("LLM Puzzle Break installed or updated:", details.reason);
    // Clear session storage on install/update
    chrome.storage.session.remove([Memory.PUZZLE_HISTORY_KEY, Memory.SCORE_KEY]);
});

chrome.runtime.onStartup.addListener(() => {
    console.log("Browser startup: Clearing puzzle history and score from session storage.");
    // Clear session storage on browser startup
    chrome.storage.session.remove([Memory.PUZZLE_HISTORY_KEY, Memory.SCORE_KEY]);
});


// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("BACKGROUND: Received message:", message);
    // Start the cognitive flow, passing sendResponse for async handling
    handleRequest(message, sendResponse);
    // Return true to indicate that sendResponse will be called asynchronously
    return true;
});


/**
 * Handles incoming requests from the popup by orchestrating the cognitive layers.
 * Manages retrieval/storage of puzzle question history and score.
 * @param {object} message - The message from the popup.
 * @param {function} sendResponse - Callback function to send results back.
 */
async function handleRequest(message, sendResponse) {
    console.log("BACKGROUND: --- Starting Cognitive Flow ---");
    let currentScore = 0; // Initialize score variable for this request cycle

    try {
        // 1. Perception Layer
        const perceivedRequest = PuzzlePerception.interpretRequest(message);
        if (!perceivedRequest) { /* ... */ sendResponse({ status: "error", message: "Unknown request received." }); return; }
        console.log("BACKGROUND: Perception Output:", perceivedRequest);

        // --- History & Score Retrieval (before Decision/Action) ---
        let askedHistory = [];
        currentScore = await Memory.getScore(); // Get current score
        console.log("BACKGROUND: Retrieved current score:", currentScore);

        if (perceivedRequest.type === 'REQUEST_NEW_PUZZLE') {
            askedHistory = await Memory.getPuzzleQuestionHistory();
            console.log("BACKGROUND: Retrieved puzzle history for DecisionMaker:", askedHistory);
        }
        // --- End Retrieval ---

        // 2. Decision-Making Layer - Pass history along
        const actionPlan = PuzzleDecisionMaker.decideNextAction(perceivedRequest, askedHistory);
        if (!actionPlan) { /* ... */ sendResponse({ status: "error", message: "Internal error: Could not decide action." }); return; }
        console.log("BACKGROUND: DecisionMaker Output (Action Plan):", actionPlan);

        // 3. Memory Layer (Get API Key)
        const apiKey = await Memory.getApiKey();

        // 4. Action Layer
        console.log("BACKGROUND: Executing action...");
        const actionResult = await PuzzleAction.execute(actionPlan, apiKey);
        console.log("BACKGROUND: Action Result:", actionResult);

        // --- History & Score Update (after action) ---
        let finalResponse = actionResult; // Start with the result from Action layer

        if (actionPlan.action === 'GENERATE_PUZZLE' && actionResult?.status === 'success' && actionResult.puzzle?.question) {
            // Add newly generated question to history
            await Memory.addPuzzleQuestionToHistory(actionResult.puzzle.question);
            // Include current score in response when sending a new question
            finalResponse.score = currentScore;
        }
        else if (actionPlan.action === 'EVALUATE_WITH_LLM' && actionResult?.status === 'success') {
            // Increment score if the answer was correct
            if (actionResult.result === 'Correct') {
                currentScore = await Memory.incrementScore(); // Increment and get new score
                console.log("BACKGROUND: Score incremented to:", currentScore);
            }
            // Include the potentially updated score in the evaluation response
            finalResponse.score = currentScore;
        }
         // If action resulted in error, include current score anyway if needed
         else if (actionResult?.status === 'error') {
             finalResponse.score = currentScore;
         }
        // --- End History & Score Update ---


        // 5. Send Response back to Popup
        console.log("BACKGROUND: Sending final response to popup:", finalResponse);
        sendResponse(finalResponse); // Send the potentially augmented result

    } catch (error) { /* ... handle orchestration error ... */
        console.error("BACKGROUND: Unexpected error during handleRequest orchestration:", error);
        // Include current score even in case of unexpected error
        sendResponse({ status: "error", message: `Orchestration error: ${error.message}`, score: currentScore });
    }
    console.log("BACKGROUND: --- Cognitive Flow Complete ---");
}
