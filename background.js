// background.js - Orchestrates the LLM Puzzle Break using 4 Layers + History + Score + Types
// Added client-side retry loop if LLM service returns a recently asked question.

import { Memory } from './memory.js';
import { PuzzlePerception } from './puzzle_perception.js';
import { PuzzleDecisionMaker } from './puzzle_decision_making.js';
import { PuzzleAction } from './puzzle_action.js';
// LLMService is used by the Action layer

console.log("LLM Puzzle Break: Background service worker started (4-Layer + History + Score + Types + Retry).");

chrome.runtime.onInstalled.addListener(details => { /* ... */ });
chrome.runtime.onStartup.addListener(() => { /* ... */ });

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("BACKGROUND: Received message:", message);
    handleRequest(message, sendResponse);
    return true; // Indicate async response
});


/**
 * Handles incoming requests from the popup by orchestrating the cognitive layers.
 * Manages retrieval/storage of puzzle question history and score.
 * Includes a retry loop if a repeated question is generated.
 * @param {object} message - The message from the popup.
 * @param {function} sendResponse - Callback function to send results back.
 */
async function handleRequest(message, sendResponse) {
    console.log("BACKGROUND: --- Starting Cognitive Flow ---");
    let currentScore = 0;

    try {
        // 1. Perception Layer
        const perceivedRequest = PuzzlePerception.interpretRequest(message);
        if (!perceivedRequest) { /* ... */ sendResponse({ status: "error", message: "Unknown request received." }); return; }
        console.log("BACKGROUND: Perception Output:", perceivedRequest);

        // --- History & Score Retrieval ---
        let askedHistory = [];
        currentScore = await Memory.getScore();
        console.log("BACKGROUND: Retrieved current score:", currentScore);
        // Always get history before decision/action for potential use/checking
        askedHistory = await Memory.getPuzzleQuestionHistory();
        console.log("BACKGROUND: Retrieved puzzle history:", askedHistory);
        // --- End Retrieval ---

        // 2. Decision-Making Layer - Pass history along
        const actionPlan = PuzzleDecisionMaker.decideNextAction(perceivedRequest, askedHistory); // Pass history here
        if (!actionPlan) { /* ... */ sendResponse({ status: "error", message: "Internal error: Could not decide action." }); return; }
        console.log("BACKGROUND: DecisionMaker Output (Action Plan):", actionPlan);

        // 3. Memory Layer (Get API Key)
        const apiKey = await Memory.getApiKey();

        // 4. Action Layer (with potential retry for GENERATE_PUZZLE)
        console.log("BACKGROUND: Executing action...");
        let actionResult;
        let retryCount = 0;
        const maxRetries = 2; // Allow up to 2 retries if a repeat is found

        if (actionPlan.action === 'GENERATE_PUZZLE') {
            while (retryCount <= maxRetries) {
                actionResult = await PuzzleAction.execute(actionPlan, apiKey);
                console.log(`BACKGROUND: Action Result (Attempt ${retryCount + 1}):`, actionResult);

                // Check for repeats ONLY if generation was successful
                if (actionResult?.status === 'success' && actionResult.puzzle?.question) {
                    const generatedQuestion = actionResult.puzzle.question;
                    // Check if the exact question is in the history we retrieved earlier
                    if (askedHistory.includes(generatedQuestion)) {
                        console.warn(`BACKGROUND: Repeated question detected (Attempt ${retryCount + 1}): "${generatedQuestion}". Retrying...`);
                        retryCount++;
                        if (retryCount > maxRetries) {
                            console.error("BACKGROUND: Max retries reached for generating a unique question.");
                            // Keep the last result even though it's a repeat, or force an error? Let's keep it.
                            break;
                        }
                        // If retrying, update the history in the action plan for the *next* LLM call
                        actionPlan.askedHistory = askedHistory; // Ensure plan has latest history view
                    } else {
                        // Not a repeat, break the loop
                        break;
                    }
                } else {
                    // Generation failed, break the loop (error will be handled below)
                    break;
                }
            }
        } else {
            // For other actions (like EVALUATE_WITH_LLM), execute just once
            actionResult = await PuzzleAction.execute(actionPlan, apiKey);
            console.log("BACKGROUND: Action Result:", actionResult);
        }


        // --- History & Score Update (after action potentially including retries) ---
        let finalResponse = actionResult;

        if (actionPlan.action === 'GENERATE_PUZZLE' && actionResult?.status === 'success' && actionResult.puzzle?.question) {
            // Add the *final* successfully generated (and hopefully unique) question to history
            await Memory.addPuzzleQuestionToHistory(actionResult.puzzle.question);
            finalResponse.score = currentScore; // Include current score
        }
        else if (actionPlan.action === 'EVALUATE_WITH_LLM' && actionResult?.status === 'success') {
            if (actionResult.result === 'Correct') {
                currentScore = await Memory.incrementScore();
                console.log("BACKGROUND: Score incremented to:", currentScore);
            }
            finalResponse.score = currentScore; // Include updated score
        }
        else if (actionResult?.status === 'error') {
             finalResponse.score = currentScore; // Include score even on error
         }
        // --- End History & Score Update ---


        // 5. Send Response back to Popup
        console.log("BACKGROUND: Sending final response to popup:", finalResponse);
        sendResponse(finalResponse);

    } catch (error) { /* ... handle orchestration error ... */
        console.error("BACKGROUND: Unexpected error during handleRequest orchestration:", error);
        sendResponse({ status: "error", message: `Orchestration error: ${error.message}`, score: currentScore });
    }
    console.log("BACKGROUND: --- Cognitive Flow Complete ---");
}
