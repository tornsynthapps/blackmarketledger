# Release 3.0.0 Plan

This release packages the UI and workflow updates completed during the current session into a coordinated version bump.

## Scope

- Promote the active-services drawer from a dashboard-only panel into a shared overlay available across the app.
- Tighten light/dark mode handling so explicit user selection wins over system preference.
- Simplify Weav3r setup by deriving the Torn user ID directly from the saved Torn API key.
- Restore a dedicated short-form log-formats page inside the docs system and repoint Terminal help to it.
- Capture the release in package metadata, changelog UI, and git tags.

## Verification Plan

1. Run `npm run build` and confirm the app builds with the new docs slug and release metadata.
2. Verify the changelog page shows `v3.0.0` as the current version.
3. Verify the Terminal page links to `/docs/log-formats`.
4. Verify the service drawer still overlays correctly and saved API keys remain visible.
