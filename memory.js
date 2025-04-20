// memory.js - Handles API key, puzzle history, and score management

const API_KEY_STORAGE_KEY = 'llmPuzzleApiKey'; // Sync storage
const PUZZLE_HISTORY_KEY = 'llmPuzzleQuestionHistory'; // Session storage
const SCORE_KEY = 'llmPuzzleScore'; // Session storage
const MAX_PUZZLE_HISTORY = 5;

export const Memory = {
    API_KEY_KEY: API_KEY_STORAGE_KEY,
    PUZZLE_HISTORY_KEY: PUZZLE_HISTORY_KEY,
    SCORE_KEY: SCORE_KEY,
    MAX_PUZZLE_HISTORY: MAX_PUZZLE_HISTORY,

    // --- API Key Functions ---
    async getApiKey() {
        try {
            const data = await chrome.storage.sync.get(this.API_KEY_KEY);
            return data[this.API_KEY_KEY] || null;
        } catch (error) { console.error("[Memory] Error getting API key:", error); return null; }
    },

    // --- Puzzle History Functions ---
    async getPuzzleQuestionHistory() {
        try {
            const data = await chrome.storage.session.get(this.PUZZLE_HISTORY_KEY);
            return data[this.PUZZLE_HISTORY_KEY] || [];
        } catch (error) { console.error("[Memory] Error getting puzzle history:", error); return []; }
    },
    async addPuzzleQuestionToHistory(questionText) {
        if (!questionText) return;
        try {
            let history = await this.getPuzzleQuestionHistory();
            if (!history.includes(questionText)) {
                 history.push(questionText);
                 const updatedHistory = history.slice(-this.MAX_PUZZLE_HISTORY);
                 await chrome.storage.session.set({ [this.PUZZLE_HISTORY_KEY]: updatedHistory });
                 console.log(`[Memory] Added question to session history. History size: ${updatedHistory.length}`);
            }
        } catch (error) { console.error("[Memory] Error adding question to history:", error); }
    },

    // --- Score Functions ---
    /**
     * Gets the current score from session storage. Initializes to 0 if not found.
     * @returns {Promise<number>} The current score.
     */
    async getScore() {
        try {
            const data = await chrome.storage.session.get(this.SCORE_KEY);
            // Return stored score or default to 0
            return data[this.SCORE_KEY] || 0;
        } catch (error) {
            console.error("[Memory] Error getting score:", error);
            return 0; // Default to 0 on error
        }
    },

    /**
     * Sets the score in session storage.
     * @param {number} score - The new score.
     */
    async setScore(score) {
        try {
            await chrome.storage.session.set({ [this.SCORE_KEY]: score });
            console.log(`[Memory] Score set to: ${score}`);
        } catch (error) {
            console.error("[Memory] Error setting score:", error);
        }
    },

    /**
     * Increments the score in session storage by one.
     * @returns {Promise<number>} The new score after incrementing.
     */
    async incrementScore() {
        let currentScore = await this.getScore();
        currentScore++;
        await this.setScore(currentScore);
        return currentScore;
    }
};
