// puzzle_perception.js - Perception Layer for LLM Puzzle Break
// Interprets messages from the popup, including puzzle type.

export const PuzzlePerception = {

    /**
     * Interprets the raw message from the popup.
     * @param {object} message - The message object received.
     * @returns {object|null} A structured representation of the perceived request or null.
     */
    interpretRequest(message) {
        console.log("[Perception] Interpreting message:", message);

        // --- LLM Aspect (Simulated) ---
        let perceivedIntent = "Unknown request.";
        if (message.type === 'getNewQuestion') {
            perceivedIntent = `User requests a new ${message.puzzleType || 'Any'} puzzle with difficulty: ${message.difficulty}`;
        } else if (message.type === 'evaluateAnswer') {
            perceivedIntent = `User requests evaluation for their answer: "${message.userAnswer?.substring(0, 20)}..."`;
        }
        console.log("[Perception] LLM interpretation (simulated):", perceivedIntent);
        // --- End LLM Aspect ---

        // Map message types to structured requests
        if (message.type === 'getNewQuestion' && message.difficulty && message.puzzleType) {
            return {
                type: 'REQUEST_NEW_PUZZLE',
                difficulty: message.difficulty,
                puzzleType: message.puzzleType // Include puzzle type
            };
        } else if (message.type === 'evaluateAnswer' && message.questionData && typeof message.userAnswer !== 'undefined') {
            return {
                type: 'EVALUATE_ANSWER',
                questionData: message.questionData,
                userAnswer: message.userAnswer
            };
        } else {
            console.warn("[Perception] Unrecognized message type or missing data:", message);
            return null;
        }
    }
};
