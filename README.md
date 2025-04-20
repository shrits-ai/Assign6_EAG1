# Web Wanderer Chrome Extension

A simple Chrome extension to help you discover new and interesting websites based on your selected categories. Click the button in the popup and wander the web! Includes optional AI enhancements using the Google Gemini API.

## Features

* Discover random websites from selected categories.
* Select interest categories directly within the extension popup.
* Uses a local `sites.json` database (you provide the sites!).
* Avoids sending you to the same site repeatedly (keeps a short history).
* **Optional:** Uses Google Gemini API (if key provided) to:
    * Interpret user intent when clicking "Wander" (Perception Layer simulation).
    * Suggest related categories based on your selections to broaden discovery (Decision-Making Layer).

## How it Works

The extension uses a simple 4-layer cognitive model in its background script (`background.js`):

1.  **Memory (`memory.js`):** Stores your category preferences, optional API key, recent navigation history, and loads the website database from the local `sites.json` file.
2.  **Perception (`perception.js`):** Detects when you click the "Wander" button via a message from the popup. If an API key is present, it uses an LLM (Gemini) to generate a simple interpretation of this intent.
3.  **Decision-Making (`decision_making.js`):** Retrieves your categories from Memory. If an API key is present, it asks the LLM (Gemini) to suggest related categories. It then filters the website database based on the combined list of categories, checks against recent history, and randomly selects a target URL.
4.  **Action (`action.js`):** Takes the chosen URL and uses `chrome.tabs.update()` to navigate your currently active tab to that URL. It then updates the navigation history via the Memory layer.

## Installation (from Source)

1.  Download or clone the project files to a local directory.
2.  **Important:** Create and populate the `sites.json` file in the project's root directory (see Configuration below).
3.  Open Google Chrome and navigate to `chrome://extensions/`.
4.  Enable **Developer mode** using the toggle switch (usually in the top-right corner).
5.  Click the **Load unpacked** button.
6.  Select the directory where you saved the project files (the one containing `manifest.json`). The extension should now appear in your list.

## Configuration

1.  **Create `sites.json`:**
    * In the root directory of the project (the same folder as `manifest.json`), create a file named exactly `sites.json`.
    * Populate this file with JSON data containing website categories and URLs. Use the structure shown in the `Example sites.json Content` document (or the `FALLBACK_SITES_DB` in `memory.js`).
    * **Crucially, add many diverse sites under the categories listed in `popup.html` for the extension to be useful!**
2.  **Select Categories:**
    * Click the Web Wanderer extension icon in your Chrome toolbar.
    * Use the checkboxes in the popup window to select the categories you are interested in.
    * Your selections are saved automatically when you click the "Save & Wander!" button.
3.  **Set API Key (Optional):**
    * To enable the LLM features (intent interpretation, category expansion), you need a Google AI (Gemini) API key. Get one from [Google AI Studio](https://aistudio.google.com/).
    * Right-click the Web Wanderer extension icon, select "Options".
    * Paste your API key into the input field.
    * Click "Save Settings".

## Usage

1.  Click the Web Wanderer icon in your Chrome toolbar.
2.  Verify or adjust your selected interest categories in the popup.
3.  Click the **Save & Wander!** button.
4.  Your currently active tab will navigate to a random website matching your selected (and potentially LLM-expanded) categories, avoiding recently visited sites.

## Security Note (API Key)

⚠️ Storing the Google AI API key via the Options page (in `chrome.storage.sync`) is **not secure** for published or shared extensions. This method is intended for **personal development and use only**. If you were to distribute this extension, you would need to implement a secure method for handling API keys, such as user authentication (OAuth) or routing requests through a secure backend proxy server that holds the key.


