// ==UserScript==
// @name         BlackMarketLedger Sync
// @namespace    http://tampermonkey.net/
// @version      3.0.4
// @description  Stores and renders cost basis for items in Torn bazaar. Syncs with BML website via events.
// @author       Rusty
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

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


const styles = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

.bml-cost-basis-cell {
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 500;
    font-size: 13px;
    cursor: pointer;
    padding: 0 4px;
    border-radius: 4px;
    transition: background 0.2s;
    display: inline-block;
}

.dark-mode .bml-cost-basis-cell { color: #67E1F4; }
.bml-cost-basis-cell { color: #0B8598; }

.bml-cost-basis-separator {
    color: #888;
    padding: 0 4px;
    font-size: 10px;
    vertical-align: middle;
    opacity: 0.7;
}

.bml-value-cyan { color: #0B8598; }
.dark-mode .bml-value-cyan { color: #67E1F4; }

.bml-profit { color: #2e7d32; }
.dark-mode .bml-profit { color: #50fa7b; }
.bml-loss { color: #c62828; }
.dark-mode .bml-loss { color: #ff5555; }

.bml-cost-basis-cell:hover {
    background: rgba(0, 0, 0, 0.05);
}
.dark-mode .bml-cost-basis-cell:hover {
    background: rgba(255, 255, 255, 0.1);
}

.bml-cost-basis-cell.is-synced {
    font-style: italic;
    opacity: 0.8;
}

.bml-cost-basis-input {
    width: 70px;
    padding: 0 4px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-family: inherit;
    font-size: 12px;
    outline: none;
    background: white;
    color: black;
    margin: 0 2px;
}

.dark-mode .bml-cost-basis-input {
    background: #333;
    color: white;
    border-color: #555;
}

.info-wrap {
    white-space: nowrap !important;
    overflow: visible !important;
    width: auto !important;
    min-width: 100px;
    display: flex !important;
    align-items: center;
}

.bml-settings-card {
    background: #111;
    border-bottom: 2px solid #0B8598;
    padding: 12px 20px;
    font-family: 'Space Grotesk', sans-serif;
    color: #ccc;
    display: flex;
    align-items: center;
    gap: 20px;
    justify-content: flex-start;
    flex-wrap: wrap;
    margin-bottom: 1px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}

.bml-settings-title {
    color: #0B8598;
    font-weight: 700;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-right: 10px;
}

.bml-settings-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
}

.bml-settings-input {
    background: #222;
    border: 1px solid #333;
    color: #67E1F4;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: inherit;
    font-size: 12px;
    outline: none;
    width: 150px;
    transition: border-color 0.2s;
}

.bml-settings-input:focus {
    border-color: #0B8598;
}

.bml-switch {
    position: relative;
    display: inline-block;
    width: 34px;
    height: 18px;
}

.bml-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.bml-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #333;
    transition: .4s;
    border-radius: 18px;
}

.bml-slider:before {
    position: absolute;
    content: "";
    height: 12px;
    width: 12px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
}

input:checked + .bml-slider {
    background-color: #0B8598;
}

input:checked + .bml-slider:before {
    transform: translateX(16px);
}

.bml-na-placeholder {
    color: #555;
    font-style: italic;
    opacity: 0.6;
}
`;

function injectStyles() {
    GM_addStyle(styles);
    const fontLink = document.createElement("link");
    fontLink.href =
        "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);
}


function logToBlackbox(event, data) {
    try {
        const logs = JSON.parse(localStorage.getItem("bml_blackbox_logs") || "[]");
        logs.push({
            timestamp: Date.now(),
            event,
            data,
        });
        if (logs.length > 100) logs.shift();
        localStorage.setItem("bml_blackbox_logs", JSON.stringify(logs));
    } catch (e) {
        console.error("[BML] Failed to log to blackbox", e);
    }
}

function sendResponse(messageId, success, data, error) {
    window.postMessage(
        {
            type: BML_RESPONSE_EVENT,
            id: messageId,
            response: { success, data, error },
        },
        "*"
    );
}

function handleHealthCheck(payload, messageId) {
    logToBlackbox("health_check", { timestamp: Date.now() });
    sendResponse(messageId, true, { status: "ok", timestamp: Date.now() });
}

function handleSaveData(payload, messageId) {
    if (!payload || !payload.data) {
        logToBlackbox("save_data_error", { error: "Invalid payload" });
        sendResponse(messageId, false, null, "Invalid payload");
        return;
    }

    const { data } = payload;
    logToBlackbox("save_data", { trigger: data._trigger || "auto" });

    if (data._trigger === "manual") {
        fetchTransactionsFromIDB().then((txns) => {
            if (txns && txns.length > 0) {
                const inventory = calculateCostBasisFromTxns(txns);
                setSyncedCostBasis(inventory);
                const itemCount = Object.keys(inventory).length;
                logToBlackbox("manual_sync_complete", { itemCount });
                showNotification(`BML: Synced ${itemCount} items`);
                if (typeof triggerRefresh === "function") {
                    triggerRefresh();
                }
                sendResponse(messageId, true, { saved: true, itemCount });
            } else {
                logToBlackbox("manual_sync_error", { error: "No transactions found" });
                sendResponse(messageId, false, null, "No transactions found");
            }
        });
        return;
    }

    if (data.inventory) {
        setSyncedCostBasis(data.inventory);
    }

    if (typeof triggerRefresh === "function") {
        triggerRefresh();
    }

    const itemCount = data.inventory ? Object.keys(data.inventory).length : 0;
    showNotification(`BML: Synced ${itemCount} items`);

    sendResponse(messageId, true, { saved: true, itemCount });
}

function fetchTransactionsFromIDB() {
    return new Promise((resolve) => {
        const dbNames = ["LogsDB", "GoogleCacheLogsDB"];

        const tryDB = (index) => {
            if (index >= dbNames.length) {
                tryLegacy();
                return;
            }

            const dbName = dbNames[index];
            try {
                const request = indexedDB.open(dbName, 2);

                request.onerror = () => tryDB(index + 1);

                request.onsuccess = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains("transactions")) {
                        db.close();
                        tryDB(index + 1);
                        return;
                    }

                    const tx = db.transaction("transactions", "readonly");
                    const store = tx.objectStore("transactions");
                    const getAll = store.getAll();

                    getAll.onsuccess = () => {
                        db.close();
                        resolve(getAll.result || []);
                    };

                    getAll.onerror = () => {
                        db.close();
                        tryDB(index + 1);
                    };
                };
            } catch (e) {
                tryDB(index + 1);
            }
        };

        const tryLegacy = () => {
            try {
                const stored = localStorage.getItem("torn_invest_tracker_logs");
                if (stored) {
                    resolve(JSON.parse(stored));
                } else {
                    resolve([]);
                }
            } catch (e) {
                resolve([]);
            }
        };

        tryDB(0);
    });
}

function calculateCostBasisFromTxns(txns) {
    const inventory = {};

    txns.forEach((t) => {
        if (!t.itemName) return;
        if (!t.currentStock || t.currentStock <= 0) return;
        if (!t.currentCostBasis || t.currentCostBasis <= 0) return;

        const itemName = t.itemName.toLowerCase();
        inventory[itemName] = Math.ceil(t.currentCostBasis);
    });

    return inventory;
}

function initMessageListener() {
    window.BML = window.BML || {};
    window.BML.initMessageListener = initMessageListener;
    window.BML.logToBlackbox = logToBlackbox;

    window.addEventListener("message", (event) => {
        if (!event.data?.message) return;
        if (event.data?.type !== EXTENSION_REQUEST_EVENT) return;

        const { type, payload } = event.data.message;
        const messageId = event.data.id;

        switch (type) {
            case "HEALTH":
                handleHealthCheck(payload, messageId);
                break;
            case "SAVE_DATA":
                handleSaveData(payload, messageId);
                break;
            case "COST_BASIS_UPDATE":
                if (payload?.inventory) {
                    setSyncedCostBasis(payload.inventory);
                    if (typeof triggerRefresh === "function") {
                        triggerRefresh();
                    }
                }
                break;
        }
    });
}


function processRow(row) {
    if (!row || row.classList.contains("tt-row")) return;

    const forceWrite = getSetting(BML_FORCE_WRITE, false);
    if (row.dataset.bmlProcessed === "true" && !forceWrite) return;

    const infoWrap = row.querySelector(".info-wrap");
    if (!infoWrap) return;

    const img = row.querySelector('img[src*="/images/items/"]');
    if (!img) return;
    const match = img.src.match(/\/items\/(\d+)\//);
    if (!match) return;
    const itemId = match[1];

    const nameNode = row.querySelector(".name-wrap .t-overflow");
    if (!nameNode) return;
    const itemName = nameNode.innerText.trim();
    if (!itemName) return;

    const syncedData = getSyncedCostBasis();
    const costBasis = syncedData[itemName.toLowerCase()] || 0;

    if (!costBasis) {
        row.dataset.bmlProcessed = "true";
        return;
    }

    const useCompact = getSetting(BML_COMPACT_PRICES, true);
    const containerId = `bml-container-${itemId}`;
    let container = document.getElementById(containerId);

    if (container && forceWrite) {
        const currentText = container.innerText;
        if (
            !currentText.includes("CB:") ||
            !currentText.includes(formatCurrency(costBasis, useCompact))
        ) {
            container.remove();
            container = null;
        }
    }

    if (container) {
        row.dataset.bmlProcessed = "true";
        return;
    }

    container = document.createElement("span");
    container.id = containerId;
    container.className = "bml-cost-basis-cell";
    container.innerText = "CB: " + formatCurrency(costBasis, useCompact);
    container.title = `Cost Basis: ${formatCurrency(costBasis)}`;

    if (!infoWrap.innerText.includes(" · ")) {
        infoWrap.appendChild(document.createTextNode(" · "));
    }

    infoWrap.appendChild(container);
    row.dataset.bmlProcessed = "true";
}

function triggerRefresh() {
    debugLog.log("Triggering data refresh for all rows...");
    const rows = document.querySelectorAll("li.clearfix:not(.tt-row)");
    rows.forEach((r) => {
        const cb = r.querySelector(".bml-cost-basis-cell");
        if (cb) cb.remove();
        r.dataset.bmlProcessed = "false";
        processRow(r);
    });
}

function initTornBazaarObserver() {
    debugLog.log("Initializing Torn Bazaar observer...");

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    if (node.tagName === "LI" && node.classList.contains("clearfix")) {
                        processRow(node);
                    } else {
                        const rows = node.querySelectorAll("li.clearfix");
                        if (rows.length > 0) rows.forEach(processRow);
                    }
                    if (node.matches("ul.items-cont, ul.bazaar-list, div.items-cont")) {
                        node.querySelectorAll("li.clearfix").forEach(processRow);
                    }
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const initialRows = document.querySelectorAll("li.clearfix");
    if (initialRows.length > 0) {
        initialRows.forEach(processRow);
    }

    setInterval(() => {
        const rows = document.querySelectorAll("li.clearfix:not(.tt-row)");
        rows.forEach((row) => {
            if (!row.querySelector(".bml-cost-basis-cell")) {
                processRow(row);
            }
        });
    }, 3000);
}

function createSettingsUI() {
    if (document.getElementById("bml-settings-ui")) return;

    const targetHeader = document.querySelector(
        'div[class*="appHeaderWrapper"][class*="disableLinksRightMargin"]'
    );
    if (!targetHeader) return;

    const card = document.createElement("div");
    card.id = "bml-settings-ui";
    card.className = "bml-settings-card";

    const title = document.createElement("div");
    title.className = "bml-settings-title";
    title.innerText = "BML Settings";
    card.appendChild(title);

    const createToggle = (label, key, defaultValue) => {
        const item = document.createElement("div");
        item.className = "bml-settings-item";
        item.innerHTML = `<span>${label}</span>`;
        const labelEl = document.createElement("label");
        labelEl.className = "bml-switch";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = getSetting(key, defaultValue);
        input.onchange = () => {
            setSetting(key, input.checked);
            showNotification(`BML: ${label} ${input.checked ? "Enabled" : "Disabled"}`);
            triggerRefresh();
        };
        const slider = document.createElement("span");
        slider.className = "bml-slider";
        labelEl.appendChild(input);
        labelEl.appendChild(slider);
        item.appendChild(labelEl);
        return item;
    };

    card.appendChild(createToggle("Compact (K/M)", BML_COMPACT_PRICES, true));

    targetHeader.parentNode.insertBefore(card, targetHeader.nextSibling);
    debugLog.log("Settings UI injected");
}

function initTornBazaar() {
    console.log("[BML] initTornBazaar called");
    injectStyles();
    createSettingsUI();
    console.log("[BML] About to call initMessageListener");
    initMessageListener();
    console.log("[BML] initMessageListener done");
    initTornBazaarObserver();
    console.log("[BML] initTornBazaar complete");
}

if (typeof window !== "undefined") {
    window.BML = window.BML || {};
    window.BML.triggerRefresh = triggerRefresh;
    window.BML.processRow = processRow;
    window.BML.manuallyInitListener = initMessageListener;
}

if (document.readyState === "complete" || document.readyState === "interactive") {
    initTornBazaar();
} else {
    document.addEventListener("DOMContentLoaded", initTornBazaar);
}


})();
