---
name: readme-sync
description: >
  Automatically updates or creates the directory's README.md file whenever any file within a directory is created, updated, or deleted. Ensures folder documentation always reflects current file lists, purpose, and key exports. Use when adding, editing, or deleting code files, or when user asks to update folder READMEs or run /readme-sync.
---

# README Synchronization Skill (`readme-sync`)

This skill enforces continuous documentation maintenance as mandated by [`.agents/INSTRUCTIONS.md`](file:///C:/Users/PixelGhost/Desktop/Codehub/blackmarketledger/.agents/INSTRUCTIONS.md#L35-L41). Whenever an agent creates, modifies, or deletes a file in any directory, the corresponding `README.md` file MUST be updated.

---

## Rules & Execution Directives

### 1. Trigger Conditions
This skill MUST be executed automatically whenever:
- A new file is created in any project directory.
- An existing file is modified or refactored (especially if exported functions, classes, interfaces, or types are added or changed).
- A file is deleted or renamed.
- A new subfolder is created or deleted.
- The user requests to sync or update folder documentation, or invokes `/readme-sync`.

---

### 2. Update Protocol per Folder

Whenever modifying files in `<directory_path>/`:

1. **Check Existence**:
   - Verify if `<directory_path>/README.md` exists. If not, create it immediately.

2. **When Adding a File**:
   - Add a bullet point under `## Files & Contents` with the file basename.
   - Summarize the file's primary role and list all exported functions, classes, interfaces, or types.

3. **When Editing a File**:
   - Update the file description under `## Files & Contents` if its responsibilities changed.
   - Update the **Exports** listing if signatures, exported types, or functions changed.

4. **When Deleting a File**:
   - Remove the deleted file entry from `## Files & Contents`.

5. **When Adding/Removing Subdirectories**:
   - Update the `## Subdirectories` section of the parent folder's `README.md`.

---

### 3. Folder README Standard Template

```markdown
# [Directory Name]

Directory path: `[relative/path]`

## Purpose

[Clear, single-paragraph explanation of what this folder handles and why it exists]

## Subdirectories (if applicable)

- `[subfolder]/`: [Description of subfolder]

## Files & Contents

- **`[filename.ext]`**: [Summary of what this file does]
  - **Exports**: `Function: funcName()`, `Class: ClassName`, `Interface: TypeName`
```

---

### 4. Helper Script Integration

For programmatic bulk sync or project verification, agents can run:
```powershell
node scratch/generate_readmes.mjs
```
Or execute the skill script at [scripts/sync.mjs](file:///C:/Users/PixelGhost/Desktop/Codehub/blackmarketledger/.agents/skills/readme-sync/scripts/sync.mjs).
