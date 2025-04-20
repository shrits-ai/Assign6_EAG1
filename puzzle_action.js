// puzzle_action.js - Action Layer for LLM Puzzle Break
// Executes the decided action plan, passing history and type to LLM Service.

import { LLMService } from './llm_service.js';

export const PuzzleAction = {

    /**
     * Executes the action plan determined by the DecisionMaker.
     * @param {object} actionPlan - The output from the DecisionMaker layer.
     * @param {string} apiKey - The Google AI API key.
     * @returns {Promise<object|null>} The result of the action or null on failure.
     */
    async execute(actionPlan, apiKey) {
        console.log("[Action] Executing action plan:", actionPlan);

        if (!actionPlan || !actionPlan.action) { /* ... */ return { status: "error", message: "Internal error: Invalid action plan." }; }
        if (!apiKey) { /* ... */ return { status: "error", message: "API Key not set in options." }; }

        try {
            switch (actionPlan.action) {
                case 'GENERATE_PUZZLE':
                    // Pass askedHistory and puzzleType from the plan to the LLM service
                    const puzzleData = await LLMService.generatePuzzle(
                        apiKey,
                        actionPlan.difficulty,
                        actionPlan.puzzleType, // Pass puzzle type
                        actionPlan.askedHistory
                    );
                    if (puzzleData) { return { status: "success", puzzle: puzzleData }; }
                    else { return { status: "error", message: "Failed to generate puzzle from AI." }; }

                case 'EVALUATE_WITH_LLM':
                    const evaluationResult = await LLMService.evaluateAnswer(
                        apiKey,
                        actionPlan.questionData.question,
                        actionPlan.userAnswer,
                        actionPlan.questionData.answer
                    );
                    if (evaluationResult === 'Correct' || evaluationResult === 'Incorrect') { return { status: "success", result: evaluationResult, correctAnswer: actionPlan.questionData.answer }; }
                    else { return { status: "error", message: evaluationResult || "AI evaluation failed." }; }

                default:
                    /* ... */ return { status: "error", message: `Internal error: Unknown action ${actionPlan.action}` };
            }
        } catch (error) { /* ... */ return { status: "error", message: `Execution error: ${error.message}` }; }
    }
};
