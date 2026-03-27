# Abroad & Self-Sell Guide

This guide explains how to use **Abroad** tracking and the **Self-Sell** concept to master your profit margins and differentiate between sourcing gains and trading gains.

## ✈️ Abroad Tracking

BML allows you to mark transactions as "Abroad." This is specifically for items purchased while traveling to other countries in Torn.
- **Cost Basis**: BML tracks exactly what you paid for that Lion Plushie in South Africa.
- **Separation**: These items are tracked in your "Abroad Inventory" until they are moved to your main storage or sold.

## 🔄 The Self-Sell Concept

The most advanced feature of BML is the **Self-Sell** workflow. It allows you to answer the question: *"Did I make more money by traveling, or by being a good trader?"*

### Why Use Self-Sell?
Without Self-Sell, if you buy an item for $500 abroad and sell it for $50,000 in Torn, you see a $49,500 "profit." But this profit is a mix of your travel effort and your market timing.

### How It Works (The Lion Plushie Example)
1. **Buy Abroad**: You buy a Lion Plushie in South Africa for **$500**.
2. **Return to Torn**: You check a pricelist (like Weav3r) and see the current market value is **$48,000**.
3. **Self-Sell**: You "sell" the plushie to yourself at that market rate ($48,000).
4. **Final Sale**: Later, you sell that plushie in your bazaar for **$50,000**.

### The Resulting Analytics:
- **Abroad Profit**: $48,000 (Market Rate) - $500 (Abroad Cost) = **$47,500**.
- **Trading Profit**: $50,000 (Final Sale) - $48,000 (Market Rate) = **$2,000**.

BML now shows you that your travel was worth $47.5k, while your bazaar management earned you an additional $2k.

## 🛠️ How to Implement Self-Sell

While you can implement this manually in the Terminal ([see below](#manual-method)), BML provides a much faster way:

### ⚡ The Self-Sell Button (Recommended)
1. Navigate to the **Abroad** tab.
2. In your inventory list, you will see a **Self-Sell** button next to each item.
3. Clicking this button will automatically "sell" the item to yourself at the current market rate and "buy" it back, locking in your travel profit immediately.

### 💻 Manual Method (Terminal)
1. Go to the **Terminal**.
2. Create a "Sell" entry for your items at the current market value (e.g., `Lion Plushie S 48000`).
3. Immediately create a "Buy" entry for the same items at the same price (e.g., `Lion Plushie B 48000`).
4. This "resets" the cost basis for your trading inventory while locking in the profit for your abroad activity.

## 📉 Benefits

- **Efficiency Analysis**: Determine if specific travel destinations are still worth the flight time.
- **Trading Mastery**: Track your true trading skill by isolating market-based gains from simple sourcing.
- **Accurate Inventory**: Your main dashboard reflects the "current market value" cost basis, making your localized profit tracking more realistic.
