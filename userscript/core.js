const DEBUG = true;

const SYNCED_DATA_KEY = "bml_synced_cost_basis";
const BML_COMPACT_PRICES = "bml_compact_prices";
const BML_FORCE_WRITE = "bml_force_write";

const EXTENSION_REQUEST_EVENT = "BML_EXTENSION_REQUEST";
const BML_RESPONSE_EVENT = "BML_EXTENSION_RESPONSE";

const debugLog = {
    log: (...args) => DEBUG && console.log("[BML]", ...args),
    warn: (...args) => console.warn("[BML]", ...args),
    error: (...args) => console.error("[BML]", ...args),
};

/**
 * Retrieves the synced cost basis data from Tampermonkey's storage.
 * 
 * @returns {Object} Mapping of item names to cost basis values.
 */
function getSyncedCostBasis() {
    return GM_getValue(SYNCED_DATA_KEY, {});
}

/**
 * Saves the synced cost basis data to Tampermonkey's storage.
 * 
 * @param {Object} data - Mapping of item names to cost basis values.
 * @returns {void}
 */
function setSyncedCostBasis(data) {
    GM_setValue(SYNCED_DATA_KEY, data);
}

/**
 * Retrieves a persistent setting value.
 * 
 * @param {string} key - The setting key.
 * @param {any} defaultValue - Value to return if the setting is not found.
 * @returns {any} The stored value or default.
 */
function getSetting(key, defaultValue) {
    return GM_getValue(key, defaultValue);
}

/**
 * Saves a persistent setting value.
 * 
 * @param {string} key - The setting key.
 * @param {any} value - The value to store.
 * @returns {void}
 */
function setSetting(key, value) {
    GM_setValue(key, value);
}

/**
 * Formats a numeric value as currency (USD).
 * Supports compact formatting (e.g., $1.2M, $500K).
 * 
 * @param {number} value - The numeric value to format.
 * @param {boolean} [compact=false] - Whether to use compact representation.
 * @returns {string} The formatted currency string.
 */
function formatCurrency(value, compact = false) {
    if (value === undefined || value === null || value === 0) return "N/A";

    if (compact) {
        if (value >= 1000000) {
            return "$" + (value / 1000000).toFixed(1) + "M";
        }
        if (value >= 1000) {
            return "$" + (value / 1000).toFixed(1) + "K";
        }
    }

    return "$" + Math.ceil(value).toLocaleString();
}

/**
 * Displays a temporary toast notification on the screen.
 * 
 * @param {string} message - The message to display.
 * @returns {void}
 */
function showNotification(message) {
    debugLog.log("Notification:", message);
    const toast = document.createElement("div");
    toast.innerText = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #0B8598;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 500;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: bmlFadeIn 0.3s ease, bmlFadeOut 0.3s ease 2.7s forwards;
    `;

    // Inject styles for toast animations if not already present
    if (!document.getElementById("bml-toast-style")) {
        const style = document.createElement("style");
        style.id = "bml-toast-style";
        style.innerHTML = `
            @keyframes bmlFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes bmlFadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-20px); } }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
