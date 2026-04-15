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

function getSyncedCostBasis() {
    return GM_getValue(SYNCED_DATA_KEY, {});
}

function setSyncedCostBasis(data) {
    GM_setValue(SYNCED_DATA_KEY, data);
}

function getSetting(key, defaultValue) {
    return GM_getValue(key, defaultValue);
}

function setSetting(key, value) {
    GM_setValue(key, value);
}

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
