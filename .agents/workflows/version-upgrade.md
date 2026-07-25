---
description: Upgrade version and commit changes.
---

This workflow handles the process of bumping the project version, updating the changelog page, and tagging the release.

1.  **Commit Existing Changes**: Ensure everything is committed FIRST by running the `/commit` workflow logic.
    ```bash
    git status
    # ... then stage and git commit -m "your message" --as-rusty
    ```

2.  **Inspect Commit History**: Check all commit messages since the last version tag.
    ```bash
    # Get the last tag if it exists:
    LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
    echo "Last tag: $LAST_TAG"
    
    # List changes from last tag until now:
    git log "$LAST_TAG"..HEAD --oneline
    ```

3.  **Determine Version Bump**:
    - MAJOR: Breaking changes.
    - MINOR: New features, significant UI updates.
    - PATCH: Bug fixes, small improvements.

4.  **Update `package.json`**: Update the version. Do NOT commit yet.
    ```json
    "version": "X.Y.Z"
    ```

5.  **Update Changelog UI**: 
    - Open `app/changelog/page.tsx`.
    - **Step A: Move Current Version to Historical List**:
        Take the old version number (the one that was in `package.json` before the bump) and its list of changes from the "Current Version" section (lines 17-45). 
        Create a new historical block (using the format from line 48) and insert it BEFORE the previous historical version.
    - **Step B: Populate Current Version with New Changes**: 
        Update the "Current Version" section (line 24) using the NEW version from `package.json`. 
        Update the date (line 25).
        Update the `<ul>` (lines 29-44) with HIGHLIGHTS summarizing the new work done in the commit messages discovered in Step 2.

6.  **Stage & Commit**: 
    // turbo
    ```bash
    git add .
    git commit -m "chore: bump version to v[NEW_VERSION] and update changelog" --as-rusty
    ```

7.  **Tag**: 
    // turbo
    ```bash
    git tag v[NEW_VERSION]
    ```

8.  **Verify**: Log status and tags.
    ```bash
    git log -1
    git tag -l --sort=-v:refname | head -n 5
    ```