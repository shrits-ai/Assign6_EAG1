// Get UI elements
const questionArea = document.getElementById('question-area');
const answerInput = document.getElementById('answer-input');
const submitButton = document.getElementById('submit-button');
const feedbackArea = document.getElementById('feedback-area');
const controlsArea = document.getElementById('controls-area');
const optionsLink = document.getElementById('options-link');
const scoreArea = document.getElementById('score-area'); // Score display
const typeSelectionArea = document.querySelector('.type-selection'); // Type radio buttons container

// Game state variables
let currentPuzzle = null; // Stores { question: string, answer: string }
let currentDifficulty = 'Easy'; // Default difficulty
let currentPuzzleType = 'Any'; // Default puzzle type
let currentScore = 0; // Track score locally for display updates
let isWaiting = false; // Prevent multiple submissions

/**
 * Updates the score display in the header.
 * @param {number} score
 */
function displayScore(score) {
    currentScore = score; // Update local score state
    scoreArea.textContent = `Score: ${score}`;
}

/**
 * Sets the UI state (loading, playing, feedback).
 * @param {'loading' | 'playing' | 'feedback' | 'error'} state
 * @param {string} [message=''] - Optional message for feedback/error/loading state OR the evaluation result ('Correct'/'Incorrect').
 * @param {string} [correctAnswer=''] - Optional: The correct answer for feedback.
 * @param {number} [score] - Optional: The current score to display.
 */
function setUIState(state, message = '', correctAnswer = '', score) {
    console.log("Setting UI State:", state, message);
    feedbackArea.textContent = '';
    feedbackArea.innerHTML = '';
    feedbackArea.className = 'feedback-area';
    controlsArea.classList.add('hidden');
    questionArea.classList.remove('loading');
    answerInput.disabled = true;
    submitButton.disabled = true;
    isWaiting = false;

    // Update score display if provided
    if (typeof score === 'number') {
        displayScore(score);
    }

    switch (state) {
        case 'loading':
            questionArea.textContent = message || 'Loading puzzle...';
            questionArea.classList.add('loading');
            isWaiting = true;
            break;
        case 'playing':
            questionArea.textContent = currentPuzzle?.question || 'Error: No question loaded.';
            answerInput.disabled = false;
            submitButton.disabled = false;
            answerInput.value = '';
            answerInput.focus();
            break;
        case 'feedback':
            feedbackArea.textContent = message; // 'Correct' or 'Incorrect'
            if (message === 'Correct') {
                feedbackArea.classList.add('feedback-correct');
            } else if (message === 'Incorrect') {
                feedbackArea.classList.add('feedback-incorrect');
                if (correctAnswer) {
                     feedbackArea.innerHTML += `<span>Correct Answer: ${escapeHtml(correctAnswer)}</span>`;
                }
            } else { // Handle evaluation errors
                 feedbackArea.classList.add('feedback-error');
            }
            controlsArea.classList.remove('hidden');
            updateDifficultyButtons();
            updateTypeSelection(); // Ensure type radio buttons reflect current state
            break;
        case 'error':
            questionArea.textContent = 'Error';
            feedbackArea.textContent = message || 'An error occurred.';
            feedbackArea.classList.add('feedback-error');
            controlsArea.classList.remove('hidden');
            updateDifficultyButtons();
            updateTypeSelection();
            break;
    }
}

/** Updates the visual state of difficulty buttons. */
function updateDifficultyButtons() {
    const buttons = controlsArea.querySelectorAll('.difficulty-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.difficulty === currentDifficulty);
    });
}

/** Updates the visual state of puzzle type radio buttons. */
function updateTypeSelection() {
    const radios = typeSelectionArea.querySelectorAll('input[name="puzzleType"]');
    radios.forEach(radio => {
        radio.checked = (radio.value === currentPuzzleType);
    });
}

/** Requests a new question from the background script. */
function getNewQuestion() {
    if (isWaiting) return;
    // Read current type selection *before* requesting
    const selectedType = typeSelectionArea.querySelector('input[name="puzzleType"]:checked')?.value || 'Any';
    currentPuzzleType = selectedType; // Update state

    setUIState('loading', `Loading ${currentDifficulty} ${currentPuzzleType} puzzle...`, '', currentScore); // Show score while loading
    currentPuzzle = null;

    console.log(`POPUP: Requesting new question. Difficulty: ${currentDifficulty}, Type: ${currentPuzzleType}`);
    chrome.runtime.sendMessage(
        { type: 'getNewQuestion', difficulty: currentDifficulty, puzzleType: currentPuzzleType }, // Send type
        (response) => {
            if (chrome.runtime.lastError) { setUIState('error', `Error: ${chrome.runtime.lastError.message}`, '', currentScore); return; }
            if (response?.status === 'success' && response.puzzle) {
                currentPuzzle = response.puzzle;
                // Pass score received from background (which should be the current score before potential increment)
                setUIState('playing', '', '', response.score);
            } else {
                 setUIState('error', `Failed to get puzzle: ${response?.message || 'Unknown error'}`, '', response?.score ?? currentScore);
                 if(response?.message?.toLowerCase().includes('api key')) { /* ... handle API key error ... */ feedbackArea.innerHTML += ` <a href="#" id="options-link-inline">Set Key?</a>`; document.getElementById('options-link-inline')?.addEventListener('click', openOptionsPage); }
            }
        }
    );
}

/** Submits the user's answer for evaluation. */
function submitAnswer() {
    if (isWaiting || !currentPuzzle) return;

    const userAnswer = answerInput.value.trim();
    if (!userAnswer) { /* ... handle empty answer ... */ feedbackArea.textContent = 'Please enter an answer.'; feedbackArea.className = 'feedback-area feedback-error'; return; }

    setUIState('loading', 'Checking answer...', '', currentScore); // Show score while checking
    isWaiting = true;

    console.log(`POPUP: Sending answer for evaluation. User: "${userAnswer}"`);
    chrome.runtime.sendMessage(
        { type: 'evaluateAnswer', questionData: currentPuzzle, userAnswer: userAnswer },
        (response) => {
            isWaiting = false;
            if (chrome.runtime.lastError) { setUIState('error', `Evaluation Error: ${chrome.runtime.lastError.message}`, '', currentScore); }
            else if (response?.status === 'success') {
                console.log("POPUP: Received evaluation:", response.result, "New Score:", response.score);
                // Pass evaluation result, correct answer, AND the updated score
                setUIState('feedback', response.result, response.correctAnswer, response.score);
            } else { setUIState('error', `Evaluation Failed: ${response?.message || 'Unknown error'}`, '', response?.score ?? currentScore); }
        }
    );
}

/** Handles clicks within the controls area */
function handleControlClick(event) {
    const target = event.target;
    if (target.classList.contains('play-again-btn')) {
        getNewQuestion();
    } else if (target.classList.contains('difficulty-btn')) {
        const newDifficulty = target.dataset.difficulty;
        if (newDifficulty && newDifficulty !== currentDifficulty) {
            currentDifficulty = newDifficulty;
            console.log("POPUP: Difficulty changed to", currentDifficulty);
            updateDifficultyButtons();
            // Optionally get new question immediately on difficulty change, or wait for "Play Again"
            // getNewQuestion();
        }
    }
    // Note: Type selection change doesn't immediately trigger new question,
    // it's read when 'Play Again' or difficulty button triggers getNewQuestion.
}

/** Handles changes to the puzzle type selection */
function handleTypeChange(event) {
    if (event.target.name === 'puzzleType') {
        currentPuzzleType = event.target.value;
        console.log("POPUP: Puzzle type selection changed to:", currentPuzzleType);
        // We don't get a new question immediately, only when Play Again/Difficulty is used.
    }
}

/** Opens the extension's options page. */
function openOptionsPage(event) { /* ... same as before ... */ event.preventDefault(); if (chrome.runtime.openOptionsPage) { chrome.runtime.openOptionsPage(); } else { window.open(chrome.runtime.getURL('options.html')); } }

/** Simple HTML escaping */
function escapeHtml(unsafe) { /* ... same as before ... */ if (!unsafe) return ''; return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

// --- Event Listeners ---
submitButton.addEventListener('click', submitAnswer);
answerInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') { event.preventDefault(); submitAnswer(); } });
controlsArea.addEventListener('click', handleControlClick);
typeSelectionArea.addEventListener('change', handleTypeChange); // Listen for type changes
optionsLink.addEventListener('click', openOptionsPage);

// Initial load: Get first question and initial score
document.addEventListener('DOMContentLoaded', getNewQuestion); // getNewQuestion will also update score display via its response handling
