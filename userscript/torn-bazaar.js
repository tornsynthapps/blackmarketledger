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
