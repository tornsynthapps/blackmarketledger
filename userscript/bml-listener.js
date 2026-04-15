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
