// memory.js - Handles storage for categories, history, API key, and website data

// Fallback database if fetching local JSON fails
const FALLBACK_SITES_DB = {
    categories: ["Art", "Science", "Funny", "Weird", "Technology", "History", "Games", "Music", "Travel"],
    sites: [
      // Keep your fallback list here
      {"url": "https://www.thisiscolossal.com/", "category": "Art"},
      {"url": "https://mymodernmet.com/category/art/", "category": "Art"},
      {"url": "https://apod.nasa.gov/apod/astropix.html", "category": "Science"},
      {"url": "https://waitbutwhy.com/", "category": "Science"},
      {"url": "https://theoatmeal.com/", "category": "Funny"},
      {"url": "https://xkcd.com/", "category": "Funny"},
      {"url": "https://archive.org/web/", "category": "History"},
      {"url": "https://www.atlasobscura.com/", "category": "Weird"},
      {"url": "https://pointerpointer.com/", "category": "Weird"},
      {"url": "https://neal.fun/", "category": "Weird"},
      {"url": "https://news.ycombinator.com/", "category": "Technology"}
      // ... add more fallback sites ...
    ]
  };
  
  // Cache the database in memory after first load
  let websiteDatabase = null;
  
  // Define storage keys
  const CATEGORIES_KEY = 'wandererCategories';
  const HISTORY_KEY = 'wandererHistory';
  const API_KEY_KEY = 'wandererApiKey';
  
  export const Memory = {
      CATEGORIES_KEY: CATEGORIES_KEY,
      HISTORY_KEY: HISTORY_KEY,
      API_KEY_KEY: API_KEY_KEY,
      MAX_HISTORY_SIZE: 20, // Avoid repeating the last N sites
      DEFAULT_CATEGORIES: ["Art", "Science", "Funny"], // Default categories if none saved
  
      /**
       * Retrieves the user's selected categories from sync storage.
       * Falls back to default categories if none are set.
       * @returns {Promise<string[]>} Array of category strings.
       */
      async getCategories() {
          try {
              const data = await chrome.storage.sync.get(this.CATEGORIES_KEY);
              const savedCats = data[this.CATEGORIES_KEY];
              // Return saved categories if valid, otherwise return defaults
              return savedCats && Array.isArray(savedCats) && savedCats.length > 0
                     ? savedCats
                     : this.DEFAULT_CATEGORIES;
          } catch (error) {
              console.error("[Memory] Error getting categories:", error);
              return this.DEFAULT_CATEGORIES; // Fallback on error
          }
      },
  
      /**
       * Retrieves the recent wander history (list of URLs) from local storage.
       * @returns {Promise<string[]>} Array of recently visited URLs.
       */
      async getHistory() {
          try {
              const data = await chrome.storage.local.get(this.HISTORY_KEY);
              return data[this.HISTORY_KEY] || []; // Return empty array if not set
          } catch (error) {
              console.error("[Memory] Error getting history:", error);
              return [];
          }
      },
  
      /**
       * Adds a URL to the wander history in local storage, maintaining max size.
       * @param {string} url - The URL to add.
       */
      async addToHistory(url) {
          if (!url) return;
          try {
              let history = await this.getHistory();
              // Remove existing instance if present to move it to the end (most recent)
              history = history.filter(hUrl => hUrl !== url);
              history.push(url);
              // Keep history size manageable
              const updatedHistory = history.slice(-this.MAX_HISTORY_SIZE);
              await chrome.storage.local.set({ [this.HISTORY_KEY]: updatedHistory });
              console.log(`[Memory] Added '${url}' to history. History size: ${updatedHistory.length}`);
          } catch (error) {
              console.error("[Memory] Error adding to history:", error);
          }
      },
  
      /**
       * Retrieves the stored Google AI API key from sync storage.
       * @returns {Promise<string|null>} The API key string or null if not set/error.
       */
      async getApiKey() {
          try {
              // SECURITY WARNING: Storing API keys this way is not recommended for published extensions.
              const data = await chrome.storage.sync.get(this.API_KEY_KEY);
              return data[this.API_KEY_KEY] || null;
          } catch (error) {
              console.error("[Memory] Error getting API key:", error);
              return null;
          }
      },
  
      /**
       * Gets the website database by fetching the local sites.json file.
       * Falls back to hardcoded data if fetching fails.
       * Caches the result in memory.
       * @returns {Promise<object>} The website database object { categories: [], sites: [] }.
       */
      async getWebsiteDatabase() {
          // Return cached version if available
          if (websiteDatabase) {
              console.log("[Memory] Returning cached website database.");
              return websiteDatabase;
          }
  
          // Get the URL to the local file within the extension package
          const localJsonUrl = chrome.runtime.getURL('sites.json');
          console.log("[Memory] Attempting to fetch local website database from:", localJsonUrl);
  
          try {
              // Fetch the local JSON file
              const response = await fetch(localJsonUrl);
              if (!response.ok) {
                  // Throw error with status text for better debugging
                  throw new Error(`Fetch failed with status ${response.status} - ${response.statusText}`);
              }
              const data = await response.json();
  
              // Basic validation: check if data exists and has a sites array
              if (data && data.sites && Array.isArray(data.sites)) {
                  console.log("[Memory] Successfully fetched and validated local sites.json.");
                  websiteDatabase = data; // Cache it
                  return websiteDatabase;
              } else {
                  console.warn("[Memory] Local sites.json data is invalid or empty. Falling back.");
              }
          } catch (error) {
              console.error("[Memory] Error fetching or parsing local sites.json:", error, "Using fallback.");
          }
  
          // Use fallback if fetch fails or data is invalid
          console.log("[Memory] Using fallback website database.");
          websiteDatabase = FALLBACK_SITES_DB; // Cache fallback
          return websiteDatabase;
      }
  };
  