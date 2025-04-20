console.log("Dev Context Helper: Content script injected.");

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'getContext') {
        console.log("Content script received getContext request.");
        const context = analyzePage();
        console.log("Content script sending context:", context);
        sendResponse(context);
        return true; // Indicates asynchronous response (though analysis is sync here)
    }
     else if (request.type === 'highlightAndGetContext') {
         // Experimental: Highlight specific code block (requires more logic)
         console.log("Highlight request received (not fully implemented)");
         // Find element by some identifier passed in request.elementId
         // element.style.border = "2px solid yellow";
         sendResponse({ status: "Highlight attempted (basic)" });
     }
});

function analyzePage() {
    let context = {
        url: window.location.href,
        title: document.title,
        selectedText: window.getSelection().toString().trim(),
        detectedLanguage: null, // Try to detect from code blocks
        keywords: [],       // Keywords from code, errors, selection
        codeBlocks: [],     // Array of { language: 'js'/'python'/null, code: "..." }
        errorMessages: []   // Array of detected error strings
    };

    // 1. Get Selected Text
    if (context.selectedText) {
        context.keywords.push(...extractKeywords(context.selectedText));
        // Basic error detection in selection
        if (isLikelyError(context.selectedText)) {
             context.errorMessages.push(context.selectedText);
        }
    }

    // 2. Find Code Blocks (pre > code)
    const codeElements = document.querySelectorAll('pre code');
    codeElements.forEach(el => {
        const code = el.textContent;
        let language = detectLanguage(el);
        context.codeBlocks.push({ language: language, code: code });

        // Use the first detected language as the page's primary language
        if (!context.detectedLanguage && language) {
            context.detectedLanguage = language;
        }
        // Extract keywords from code blocks
        context.keywords.push(...extractKeywords(code, language));

        // Basic error detection in code blocks (less reliable)
         // if (isLikelyError(code)) { context.errorMessages.push(code); }
    });

     // 3. Find potential errors in specific divs (e.g., Stack Overflow error display) - needs site-specific selectors
     // Example for Stack Overflow post-summary box containing errors
     const soErrorBox = document.querySelector('.js-post-summary-container .s-notice.s-notice__danger');
     if(soErrorBox) {
         const errorText = soErrorBox.textContent.trim();
         if(errorText && !context.errorMessages.includes(errorText)){
             context.errorMessages.push(errorText);
             context.keywords.push(...extractKeywords(errorText));
         }
     }


    // 4. Deduplicate keywords
    context.keywords = [...new Set(context.keywords)];

    return context;
}

function detectLanguage(codeElement) {
    // Check class names like 'language-javascript', 'lang-python', etc.
    for (let className of codeElement.classList) {
        if (className.startsWith('language-')) {
            return className.replace('language-', '').toLowerCase();
        }
        if (className.startsWith('lang-')) {
            return className.replace('lang-', '').toLowerCase();
        }
    }
    // Check parent 'pre' element as well
    const parentPre = codeElement.closest('pre');
     if(parentPre) {
         for (let className of parentPre.classList) {
             if (className.startsWith('language-')) {
                 return className.replace('language-', '').toLowerCase();
             }
              if (className.startsWith('lang-')) {
                return className.replace('lang-', '').toLowerCase();
            }
         }
     }

    // Basic detection based on content (very rudimentary)
    const code = codeElement.textContent;
    if (code.match(/import React|useState|useEffect|=>/)) return 'javascript'; // or jsx/tsx
    if (code.match(/def |import |print\(|class |self\./)) return 'python';
    if (code.match(/<div|<span|<html/)) return 'html';
    if (code.match(/{\s*}/)) return 'css'; // Very weak

    return null; // Language not detected
}

function extractKeywords(text, language = null) {
    if (!text) return [];
    // Simple keyword extraction: split, filter common words, take longer words
    const commonWords = new Set(['the', 'a', 'an', 'is', 'was', 'were', 'be', 'to', 'of', 'in', 'it', 'that', 'this', 'and', 'or', 'for', 'with', 'as', 'on', 'at', 'from', 'by', 'new', 'function', 'var', 'let', 'const', 'if', 'else', 'while', 'for', 'return', 'import', 'export', 'class', 'def', 'self', 'public', 'private', 'static', 'void']);
    const words = text.match(/[a-zA-Z_][a-zA-Z0-9_.]*/g) || []; // Extract variable/function like names

    return words
        .map(w => w.toLowerCase())
        .filter(w => w.length > 3 && !commonWords.has(w) && !/^\d+$/.test(w)) // Longer than 3 chars, not common, not just numbers
        .slice(0, 15); // Limit number of keywords per block
}

function isLikelyError(text) {
     const lowerText = text.toLowerCase();
     const errorKeywords = ['error', 'exception', 'failed', 'warning', 'traceback', 'uncaught', 'undefined', 'nullpointer', 'segmentation fault'];
     const commonErrorPatterns = [/TypeError:/, /ReferenceError:/, /SyntaxError:/, /ValueError:/, /KeyError:/, /IndexError:/, /AttributeError:/, /FileNotFoundError:/];

     if (errorKeywords.some(kw => lowerText.includes(kw))) return true;
     if (commonErrorPatterns.some(pattern => pattern.test(text))) return true; // Use original case for patterns
     return false;
 }


// Send a message indicating the content script is ready (optional)
// chrome.runtime.sendMessage({ type: "contentScriptReady", url: window.location.href });