# Store

React state management hooks and utilities for the Black Market Ledger application.

## Files

- `useJournal.ts` - Main application state hook managing transactions, API keys, synchronization state, and Auto-Pilot functionality

## Overview

The `useJournal` hook serves as the central state management system for the application, providing:

### State Management
- Transaction logs and history
- Inventory calculations and cost basis tracking
- API key storage and validation (Torn, Weav3r, Google Drive)
- Synchronization state and progress tracking

### Auto-Pilot System
- Dual-cursor management for trade and item synchronization
- Google Drive persistence for cross-device state
- Automatic Torn API data ingestion
- Trade reconciliation with Weav3r receipts

### Persistence Layer
- IndexedDB storage for local data persistence
- Google Drive synchronization for cloud backup
- Extension storage integration for userscript communication
- Migration utilities for legacy data formats

### Utilities
- Transaction building and parsing
- Inventory snapshot generation
- Cost-basis calculations
- Data validation and migration helpers

The hook is designed to be used throughout the application via React's Context API pattern, providing a single source of truth for all application data and state.