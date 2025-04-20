// puzzle_decision_making.js - Decision-Making Layer for LLM Puzzle Break
// Passes puzzle history and type along in the action plan.

export const PuzzleDecisionMaker = {

    /**
     * Determines the action plan based on the perceived request and history.
     * @param {object} perceivedRequest - The output from the Perception layer.
     * @param {string[]} [askedHistory=[]] - Array of recently asked question strings.
     * @returns {object|null} An action plan object for the Action layer or null.
     */
    decideNextAction(perceivedRequest, askedHistory = []) {
        console.log("[DecisionMaking] Deciding action for perceived request:", perceivedRequest);
        console.log("[DecisionMaking] Using asked history length:", askedHistory.length);

        if (!perceivedRequest) { /* ... handle null request ... */ return null; }

        switch (perceivedRequest.type) {
            case 'REQUEST_NEW_PUZZLE':
                console.log("[DecisionMaking] Decided to generate a new puzzle.");
                return {
                    action: 'GENERATE_PUZZLE',
                    difficulty: perceivedRequest.difficulty,
                    puzzleType: perceivedRequest.puzzleType, // Include puzzle type
                    askedHistory: askedHistory
                };

            case 'EVALUATE_ANSWER':
                console.log("[DecisionMaking] Decided to evaluate the user's answer.");
                return {
                    action: 'EVALUATE_WITH_LLM',
                    questionData: perceivedRequest.questionData,
                    userAnswer: perceivedRequest.userAnswer
                };

            default:
                console.warn("[DecisionMaking] Cannot decide action for unknown request type:", perceivedRequest.type);
                return null;
        }
    }
};
