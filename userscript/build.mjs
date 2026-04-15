import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERSCRIPT_DIR = path.join(__dirname);
const OUTPUT_FILE = path.join(__dirname, "bml.user.js");

const HEADER = `// ==UserScript==
// @name         BlackMarketLedger Sync
// @namespace    http://tampermonkey.net/
// @version      VERSION_PLACEHOLDER
// @description  Stores and renders cost basis for items in Torn bazaar. Syncs with BML website via events.
// @author       Rusty
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';
`;

const FOOTER = `
})();
`;

const MODULES = ["core.js", "styles.js", "bml-listener.js", "torn-bazaar.js"];

let combined = HEADER;

for (const module of MODULES) {
    const modulePath = path.join(USERSCRIPT_DIR, module);
    if (!fs.existsSync(modulePath)) {
        console.error(`Module not found: ${module}`);
        process.exit(1);
    }
    const content = fs.readFileSync(modulePath, "utf-8");
    combined += "\n" + content + "\n";
}

combined += FOOTER;

const version = process.argv[2] || "2.0.0";
combined = combined.replace("VERSION_PLACEHOLDER", version);

fs.writeFileSync(OUTPUT_FILE, combined, "utf-8");

console.log(`Built userscript: ${OUTPUT_FILE}`);
console.log(`Version: ${version}`);
