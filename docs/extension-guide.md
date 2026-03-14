# BML Connect Extension Guide

**BML Connect** is a browser extension available for Google Chrome and Mozilla Firefox. It acts as a bridge between the Blackmarket Ledger web app and Torn, displaying your calculated cost-basis data directly inside `torn.com`.

## Why Use the Extension?

When you are browsing the Item Market or looking at your Bazaar in Torn, deciding on a selling price can be difficult if you don't remember what you paid for the item. The BML Connect extension solves this by retrieving your **Average Cost Basis** from the Blackmarket Ledger app and rendering a small, draggable information box directly on the Torn interface.

## Installation

### For Regular Users
*Note: Once the extension is published to the Chrome Web Store and Firefox Add-ons site, standard installation links will be provided here.*

### Developer/Manual Installation
If you have the extension source files:
1. Open your browser's extension management page:
   - **Chrome**: Go to `chrome://extensions`
   - **Firefox**: Go to `about:debugging#/runtime/this-firefox`
2. Enable **Developer mode** (usually a toggle in the top right corner).
3. Click **Load unpacked** (Chrome) or **Load temporary Add-on** (Firefox) and select the `bmlconnect` folder from the extracted ZIP file.

## Setup & Configuration

1. **Log in to the Web App**: Ensure you have an active account with transactions logged on the [Blackmarket Ledger Web App](https://blackmarketledger.web.app).
2. **Open the Extension**: Click the BML Connect icon in your browser's toolbar to open the popup.
3. **Enter API Key**: You must enter your **Torn API Key**. This is used to securely identify your Torn user account and verify your subscription status.
4. **Active Subscription**: The BML Connect extension requires an active subscription to render the cost-basis data on Torn. The extension popup will confirm your subscription status (Valid Until date).

## Using the Extension on Torn.com

Once configured and with an active subscription, BML Connect runs automatically in the background.

- **The BML Box**: When you visit supported pages (like the Item Market or Bazaar), a small box will appear on your screen. It displays the cost basis for the items you have currently logged in Blackmarket Ledger.
- **Draggable UI**: You can click and drag the BML box to move it anywhere on your screen so it doesn't obstruct your view of other Torn elements.
- **Toggle Visibility**: If you want to temporarily hide the box without uninstalling the extension, you can do so directly from the interface or extension popup.

## Data Syncing
Data is synced locally from the Blackmarket Ledger app domain. For the most accurate cost basis to show up on Torn, make sure your Blackmarket Ledger web application data is up-to-date!
