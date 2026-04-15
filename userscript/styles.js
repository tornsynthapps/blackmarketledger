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
