// ==UserScript==
// @name         ToXXXXXXXXXXXXXXXXXX
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Stores and renders cost basis for items in Torn bazaar.
// @author       Rusty
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @connect      weav3r.dev
// ==/UserScript==

(function () {
    'use strict';

    const DEBUG = true; // Set to false to disable logging
    const SYNCED_DATA_KEY = 'bml_synced_cost_basis'; // Synced from BML App (itemName based)
    const WEAV3R_API_KEY = 'weav3r_api_key';
    const WEAV3R_CACHE_KEY = 'weav3r_marketplace_cache';
    const BML_COMPACT_PRICES = 'bml_compact_prices';
    const BML_HIDE_ORIGINAL = 'bml_hide_original';
    const BML_FORCE_WRITE = 'bml_force_write';
    const WEAV3R_CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

    const debugLog = {
        log: (...args) => DEBUG && console.log('[BML Sync]', ...args),
        group: (...args) => DEBUG && console.group('[BML Sync]', ...args),
        groupEnd: () => DEBUG && console.groupEnd(),
        warn: (...args) => DEBUG && console.warn('[BML Sync]', ...args),
        error: (...args) => DEBUG && console.error('[BML Sync]', ...args)
    };

    // --- Torn Bazaar Logic ---

    // Inject Space Grotesk Font
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    // Initial Styles
    GM_addStyle(`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700&display=swap');

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

        /* Prevent overflow issues with combined text */
        .info-wrap {
            white-space: nowrap !important;
            overflow: visible !important;
            width: auto !important;
            min-width: 100px;
            display: flex !important;
            align-items: center;
        }

        /* Settings UI Styles */
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
    `);


    function getSyncedCostBasis() {
        return GM_getValue(SYNCED_DATA_KEY, {});
    }

    function formatCurrency(value, compact = false) {
        if (value === undefined || value === null || value === 0) return 'N/A';

        if (compact) {
            if (value >= 1000000) {
                return '$' + (value / 1000000).toFixed(1) + 'M';
            }
            if (value >= 1000) {
                return '$' + (value / 1000).toFixed(1) + 'K';
            }
        }

        return '$' + Math.ceil(value).toLocaleString();
    }

    async function getWeav3rAPIKey() {
        return GM_getValue(WEAV3R_API_KEY);
    }

    function createSettingsUI() {
        if (document.getElementById('bml-settings-ui')) return;

        // More robust selector for the header
        const targetHeader = document.querySelector('div[class*="appHeaderWrapper"][class*="disableLinksRightMargin"]');
        if (!targetHeader) return;

        const card = document.createElement('div');
        card.id = 'bml-settings-ui';
        card.className = 'bml-settings-card';

        const title = document.createElement('div');
        title.className = 'bml-settings-title';
        title.innerText = 'BML Settings';
        card.appendChild(title);

        // API Key Section
        const apiItem = document.createElement('div');
        apiItem.className = 'bml-settings-item';
        apiItem.innerHTML = '<span>API Key:</span>';
        const apiInput = document.createElement('input');
        apiInput.type = 'password';
        apiInput.className = 'bml-settings-input';
        apiInput.value = GM_getValue(WEAV3R_API_KEY, '');
        apiInput.placeholder = 'Weav3r API Key';
        apiInput.onchange = () => {
            GM_setValue(WEAV3R_API_KEY, apiInput.value);
            showNotification('BML: API Key Saved');
        };
        apiItem.appendChild(apiInput);
        card.appendChild(apiItem);

        // Toggles
        const createToggle = (label, key, defaultValue) => {
            const item = document.createElement('div');
            item.className = 'bml-settings-item';
            item.innerHTML = `<span>${label}</span>`;
            const labelEl = document.createElement('label');
            labelEl.className = 'bml-switch';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = GM_getValue(key, defaultValue);
            input.onchange = () => {
                GM_setValue(key, input.checked);
                showNotification(`BML: ${label} ${input.checked ? 'Enabled' : 'Disabled'}`);
                // Refresh bazaar data if active
                const rows = document.querySelectorAll('li.clearfix:not(.tt-row)');
                rows.forEach(r => {
                    const cb = r.querySelector('.bml-cost-basis-cell');
                    if (cb) cb.remove();
                    const placeholder = r.querySelector('.bml-na-placeholder');
                    if (placeholder) placeholder.remove();
                    r.dataset.bmlProcessed = 'false';
                    processRow(r);
                });
            };
            const slider = document.createElement('span');
            slider.className = 'bml-slider';
            labelEl.appendChild(input);
            labelEl.appendChild(slider);
            item.appendChild(labelEl);
            return item;
        };

        card.appendChild(createToggle('Compact (K/M)', BML_COMPACT_PRICES, true));
        card.appendChild(createToggle('Hide Original', BML_HIDE_ORIGINAL, false));
        card.appendChild(createToggle('Force Write', BML_FORCE_WRITE, false));

        targetHeader.parentNode.insertBefore(card, targetHeader.nextSibling);
        debugLog.log('Settings UI injected');
    }

    async function fetchWeav3rMarketplaceData() {
        const cached = GM_getValue(WEAV3R_CACHE_KEY);
        const now = Date.now();

        if (cached && (now - cached.timestamp < WEAV3R_CACHE_EXPIRY)) {
            debugLog.log('Using cached Weav3r marketplace data');
            return cached.data;
        }

        const apiKey = await getWeav3rAPIKey();
        if (!apiKey) {
            debugLog.warn('No Weav3r API key provided, skipping marketplace fetch');
            return null;
        }

        debugLog.log('Fetching fresh Weav3r marketplace data...');
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://weav3r.dev/api/marketplace',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                },
                onload: (response) => {
                    if (response.status === 200) {
                        try {
                            const result = JSON.parse(response.responseText);
                            const itemsMap = {};
                            result.items.forEach(item => {
                                itemsMap[item.item_id] = item.lowest_price;
                            });
                            GM_setValue(WEAV3R_CACHE_KEY, {
                                timestamp: Date.now(),
                                data: itemsMap
                            });
                            resolve(itemsMap);
                        } catch (e) {
                            debugLog.error('Failed to parse Weav3r response:', e);
                            resolve(null);
                        }
                    } else {
                        debugLog.error('Weav3r API error:', response.status, response.statusText);
                        resolve(null);
                    }
                },
                onerror: (err) => {
                    debugLog.error('Weav3r fetch error:', err);
                    resolve(null);
                }
            });
        });
    }

    let weav3rMarketplaceData = null;

    function processRow(row) {
        if (!row || row.classList.contains('tt-row')) return;

        const forceWrite = GM_getValue(BML_FORCE_WRITE, false);
        if (row.dataset.bmlProcessed === 'true' && !forceWrite) return;

        const infoWrap = row.querySelector('.info-wrap');
        if (!infoWrap) return;

        const img = row.querySelector('img[src*="/images/items/"]');
        if (!img) return;
        const match = img.src.match(/\/items\/(\d+)\//);
        if (!match) return;
        const itemId = match[1];

        const nameNode = row.querySelector('.name-wrap .t-overflow');
        if (!nameNode) return;
        const itemName = nameNode.innerText.trim();

        const syncedData = getSyncedCostBasis();
        const costBasis = syncedData[itemName.toLowerCase()] || 0;
        const lowestPrice = weav3rMarketplaceData ? weav3rMarketplaceData[itemId] : null;

        const hideOriginal = GM_getValue(BML_HIDE_ORIGINAL, false);

        // marketLoading is true if weav3rMarketplaceData is explicitly null (not an object)
        const marketLoading = weav3rMarketplaceData === null;

        if (!costBasis && !lowestPrice) {
            if (marketLoading) return;
            if (hideOriginal) {
                infoWrap.innerHTML = '';
                const placeholder = document.createElement('span');
                placeholder.className = 'bml-cost-basis-cell bml-na-placeholder';
                placeholder.innerText = 'BML N/A';
                infoWrap.appendChild(placeholder);
            }
            row.dataset.bmlProcessed = 'true';
            return;
        }

        const useCompact = GM_getValue(BML_COMPACT_PRICES, true);
        const containerId = `bml-container-${itemId}`;
        let container = document.getElementById(containerId);

        // If force write is enabled, check if we need to re-render
        if (container && forceWrite) {
            const currentText = container.innerText;
            // Simple check: if separator or cost basis text is missing/wrong
            if (!currentText.includes('(•)') || (costBasis && !currentText.includes(formatCurrency(costBasis, useCompact)))) {
                container.remove();
                container = null;
            }
        }

        if (container) {
            row.dataset.bmlProcessed = 'true';
            return;
        }

        if (hideOriginal) {
            infoWrap.innerHTML = '';
            const peerPrice = row.querySelector('.tt-item-price');
            if (peerPrice) peerPrice.style.display = 'none';
        }

        container = document.createElement('span');
        container.id = containerId;
        container.className = 'bml-cost-basis-cell';

        const createSpan = (text, className) => {
            const s = document.createElement('span');
            s.innerText = text;
            if (className) s.className = className;
            return s;
        };

        const createSeparator = () => createSpan('(•)', 'bml-cost-basis-separator');

        // Always show Cost Basis slot if we have ANY data or if we want to show N/A
        container.appendChild(createSpan(formatCurrency(costBasis, useCompact), 'bml-value-cyan'));

        // Profit/Loss section
        if (costBasis && lowestPrice) {
            container.appendChild(createSeparator());
            const diff = lowestPrice - costBasis;
            const diffText = (diff >= 0 ? '+' : '') + formatCurrency(diff, useCompact);
            container.appendChild(createSpan(diffText, diff >= 0 ? 'bml-profit' : 'bml-loss'));
        } else if (costBasis || lowestPrice) {
            container.appendChild(createSeparator());
            container.appendChild(createSpan('-', 'bml-cost-basis-separator'));
        }

        // Lowest Price section
        if (lowestPrice || marketLoading) {
            container.appendChild(createSeparator());
            container.appendChild(createSpan(marketLoading ? '...' : formatCurrency(lowestPrice, useCompact), 'bml-value-cyan'));
        }

        container.title = (lowestPrice ? `Market Lowest: ${formatCurrency(lowestPrice)}\n` : '') +
            (costBasis ? `Cost Basis: ${formatCurrency(costBasis)}` : '');

        if (!hideOriginal && !infoWrap.innerText.includes(' · ')) {
            infoWrap.appendChild(document.createTextNode(' · '));
        }

        infoWrap.appendChild(container);

        if (!marketLoading) {
            row.dataset.bmlProcessed = 'true';
        }
    }


    function triggerRefresh() {
        debugLog.log('Triggering data refresh for all rows...');
        const rows = document.querySelectorAll('li.clearfix:not(.tt-row)');
        rows.forEach(r => {
            const cb = r.querySelector('.bml-cost-basis-cell');
            if (cb) cb.remove();
            const placeholder = r.querySelector('.bml-na-placeholder');
            if (placeholder) placeholder.remove();
            r.dataset.bmlProcessed = 'false';
            processRow(r);
        });
    }

    async function initTorn() {
        debugLog.log('Initializing Torn Bazaar logic (Global Observation)...');

        createSettingsUI();

        // Start observing IMMEDIATELY so we don't miss dynamic loads while fetching
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'LI' && node.classList.contains('clearfix')) {
                            processRow(node);
                        } else {
                            const rows = node.querySelectorAll('li.clearfix');
                            if (rows.length > 0) rows.forEach(processRow);
                        }
                        if (node.matches('ul.items-cont, ul.bazaar-list, div.items-cont')) {
                            node.querySelectorAll('li.clearfix').forEach(processRow);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Process existing rows immediately (some data might be N/A until weav3r loads)
        const initialRows = document.querySelectorAll('li.clearfix');
        if (initialRows.length > 0) {
            initialRows.forEach(processRow);
        }

        // Fetch market data in background and refresh when done
        fetchWeav3rMarketplaceData().then(data => {
            weav3rMarketplaceData = data || {}; // Ensure it's not null anymore
            debugLog.log('Weav3r data initialized, refreshing rows');
            triggerRefresh();
        });

        // Periodic check in case MutationObserver misses dynamic switches
        setInterval(() => {
            const rows = document.querySelectorAll('li.clearfix:not(.tt-row)');
            rows.forEach(row => {
                if (!row.querySelector('.bml-cost-basis-cell') && !row.querySelector('.bml-na-placeholder')) {
                    processRow(row);
                }
            });
        }, 3000);
    }

    // --- BML App Sync Logic ---

    function showNotification(message) {
        debugLog.log('Showing notification:', message);
        const toast = document.createElement('div');
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

        if (!document.getElementById('bml-toast-style')) {
            const style = document.createElement('style');
            style.id = 'bml-toast-style';
            style.innerHTML = `
                @keyframes bmlFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes bmlFadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-20px); } }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    async function initBMLSync() {
        debugLog.log('Initializing BML Sync logic. Path:', window.location.pathname);

        let lastPath = window.location.pathname;
        let lastSyncTime = 0;

        // Initial check
        lastSyncTime = Date.now();
        await syncCostBasis();

        setInterval(async () => {
            const currentPath = window.location.pathname;

            if (currentPath !== lastPath) {
                debugLog.log('Path change detected:', lastPath, '->', currentPath);
                lastPath = currentPath;
            }

            const now = Date.now();
            if (lastSyncTime === 0 || now - lastSyncTime > 15000) {
                debugLog.log('Path matches /abroad. Syncing data...');
                lastSyncTime = now;
                await syncCostBasis();
            }

        }, 3000);
    }

    async function syncCostBasis() {
        debugLog.group('Starting synchronization...');
        try {
            const storagePref = localStorage.getItem("bml_storage_pref") || 'browser';
            const dbName = storagePref === 'drive' ? 'GoogleCacheLogsDB' : 'LogsDB';
            debugLog.log('Storage Preference:', storagePref);
            debugLog.log('Primary Database:', dbName);

            let txns = await getAllTransactionsFromIDB(dbName);

            // Fallback to other DB if empty
            if (!txns || txns.length === 0) {
                const otherDB = dbName === 'LogsDB' ? 'GoogleCacheLogsDB' : 'LogsDB';
                debugLog.log('No data in primary, trying:', otherDB);
                txns = await getAllTransactionsFromIDB(otherDB);
            }

            // Legacy fallback (localStorage)
            if (!txns || txns.length === 0) {
                debugLog.log('Checking localStorage legacy...');
                const legacy = localStorage.getItem('torn_invest_tracker_logs');
                if (legacy) {
                    try {
                        txns = JSON.parse(legacy);
                        debugLog.log('Data found in localStorage');
                    } catch (e) {
                        debugLog.error('Failed to parse legacy data');
                    }
                }
            }

            if (!txns || txns.length === 0) {
                debugLog.warn('No transactions found in any source.');
                debugLog.groupEnd();
                return;
            }

            debugLog.log('Found', txns.length, 'transactions. Calculating cost basis...');

            const inventory = calculateCostBasis(txns);
            const dataToSync = {};
            inventory.forEach((stats, itemName) => {
                const totalStock = stats.stock + stats.abroadStock;
                const avgCost = totalStock > 0
                    ? (stats.totalCost + stats.abroadTotalCost) / totalStock
                    : 0;
                if (avgCost > 0) {
                    dataToSync[itemName.toLowerCase()] = Math.ceil(avgCost);
                }
            });

            const itemCount = Object.keys(dataToSync).length;
            debugLog.log('Sync Success! Items with cost basis:', itemCount);

            if (itemCount > 0) {
                GM_setValue(SYNCED_DATA_KEY, dataToSync);
                showNotification(`BML: Synced ${itemCount} items`);
            } else {
                debugLog.warn('Calculation resulted in 0 items with cost basis.');
            }
        } catch (e) {
            debugLog.error('Synchronization failed:', e);
        } finally {
            debugLog.groupEnd();
        }
    }

    function getAllTransactionsFromIDB(dbName) {
        return new Promise((resolve) => {
            debugLog.log('Opening IndexedDB:', dbName);
            // Request version 2 to match the app's version
            const request = indexedDB.open(dbName, 2);

            request.onerror = () => {
                debugLog.error('IDB Open Error:', request.error);
                resolve([]); // Resolve empty instead of rejecting to allow fallbacks
            };

            request.onsuccess = () => {
                const db = request.result;
                debugLog.log('IDB opened successfully. Version:', db.version);

                try {
                    if (!db.objectStoreNames.contains('transactions')) {
                        debugLog.warn('Store "transactions" not found in', dbName);
                        db.close();
                        resolve([]);
                        return;
                    }

                    const transaction = db.transaction('transactions', 'readonly');
                    const store = transaction.objectStore('transactions');
                    const getAll = store.getAll();

                    getAll.onsuccess = () => {
                        db.close();
                        debugLog.log('Successfully fetched', getAll.result.length, 'txns from', dbName);
                        resolve(getAll.result || []);
                    };

                    getAll.onerror = () => {
                        debugLog.error('IDB Read Error:', getAll.error);
                        db.close();
                        resolve([]);
                    };
                } catch (e) {
                    debugLog.error('IDB Runtime Error:', e);
                    db.close();
                    resolve([]);
                }
            };

            request.onblocked = () => {
                debugLog.warn('IDB Open Blocked.');
                resolve([]);
            };
        });
    }

    function calculateCostBasis(txns) {
        const inv = new Map();

        // Sorting and 0.1 adjustment to match useJournal.ts logic
        const sorted = [...txns].map(t => ({
            ...t,
            sortDate: t.type === 'BUY' ? t.date - 0.1 : t.date + 0.1
        })).sort((a, b) => a.sortDate - b.sortDate);

        sorted.forEach(t => {
            if (!t.item) return;
            const current = inv.get(t.item) || { stock: 0, totalCost: 0, abroadStock: 0, abroadTotalCost: 0 };

            if (t.type === 'BUY') {
                if (t.tag === 'Abroad') {
                    current.abroadStock += (t.amount || 0);
                    current.abroadTotalCost += ((t.price || 0) * (t.amount || 0));
                } else {
                    current.stock += (t.amount || 0);
                    current.totalCost += ((t.price || 0) * (t.amount || 0));
                }
            } else if (t.type === 'SELL') {
                const totalStock = current.stock + current.abroadStock;
                if (totalStock > 0) {
                    const avgCost = (current.totalCost + current.abroadTotalCost) / totalStock;
                    const cogs = avgCost * (t.amount || 0);

                    const stockRatio = current.stock / totalStock;
                    current.totalCost -= cogs * stockRatio;
                    current.stock -= (t.amount || 0) * stockRatio;

                    current.abroadTotalCost -= cogs * (1 - stockRatio);
                    current.abroadStock -= (t.amount || 0) * (1 - stockRatio);
                }
            }
            inv.set(t.item, current);
        });
        return inv;
    }

    // Run init
    const isTorn = window.location.hostname.includes('torn.com') && window.location.pathname.includes('bazaar.php');
    const isBMLApp = !!localStorage.getItem('bml_storage_pref') || !!document.getElementById('root');

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        if (isTorn) initTorn();
        if (isBMLApp) initBMLSync();
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            if (isTorn) initTorn();
            if (isBMLApp) initBMLSync();
        });
    }

})();
