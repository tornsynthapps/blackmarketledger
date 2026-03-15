# Release 3.0.0 Walkthrough

## Summary

Version `3.0.0` packages the app-wide service drawer rollout, explicit light-mode handling, Weav3r API setup changes, mobile overlay fixes, and the new short docs page for supported log formats.

## Key Outcomes

- The active-services UI now lives in a shared drawer available across routes instead of only on the dashboard.
- The service status list is denser and uses green/red rounded status icons for quicker scanning.
- Light mode now uses explicit `dark` and `light` root classes, preventing system preference from overriding a saved manual choice.
- Weav3r configuration now resolves the Torn user ID from the provided API key instead of requiring manual entry.
- The Terminal page links to a dedicated `/docs/log-formats` page inside the docs system.
- Forum and donation banner close buttons dismiss reliably again.

## Validation

- Ran `npm run build` successfully after the release updates.
- Confirmed the docs route list now includes the added markdown page.
- Updated package metadata and changelog UI for `v3.0.0`.
