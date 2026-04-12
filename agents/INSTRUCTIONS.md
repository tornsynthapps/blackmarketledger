# INSTRUCTIONS.md

## 1. Code Documentation

### 1.1 Function-Level Documentation

Every function **must** include a structured comment that clearly specifies:

- **Purpose:** What the function does
- **Inputs:** Parameters with types and meaning
- **Outputs:** Return value and type
- **Side Effects (if any):** File I/O, network calls, mutations, etc.

**Example:**

```ts
/**
 * Fetch a user by their unique identifier.
 * @param userId (string): Unique identifier of the user
 * @returns (Promise<User>): The user object if found
 * @throws Error if user is not found
 */
```

### 1.2 Inline Comments

- Use comments to explain **why**, not just **what**
- Add comments for:
    - Non-obvious logic
    - Complex conditions or transformations
    - Workarounds or constraints

- Avoid redundant comments (e.g., `// increment i`)

### 1.3 Folder READMEs
- Each folder should have a README.md file that explains the purpose of the folder and its contents.
- If there is no README.md file, create one and add a brief description of the folder's contents.
- Whenever a new file is added to the folder, update the README.md file to reflect the new file's name and purpose.
- Whenever a file is deleted from the folder, update the README.md file to reflect the deleted file's name and purpose.
- Whenever a file is updated in the folder, update the README.md file to reflect the updated file's name and purpose.

---

## 2. Modular Design

### 2.1 Single Responsibility Principle

- Each function should perform **one well-defined task**
- Avoid multi-purpose or overloaded functions

### 2.2 Composition Over Monoliths

- Break complex logic into smaller reusable units
- Prefer composing small functions rather than writing large ones

### 2.3 File Organization

- Group related functionality into separate files/modules
- Use clear directory structures:
    - `services/` for business logic
    - `utils/` for reusable helpers
    - `models/` for data structures/types

---

### 2.4 Object-Oriented Design (IMPORTANT)

- Use classes and objects to represent complex data structures
- Use inheritance and composition to create reusable components
- Use interfaces to define contracts and enforce behavior
- Use abstract classes and mixins to create flexible and extensible code

---

## 3. Naming Conventions

### 3.1 Variables

- Use **descriptive and unambiguous names**
- Avoid abbreviations unless universally understood

**Good:**

```ts
(userId, totalPrice, isAuthenticated);
```

**Bad:**

```ts
(uid, tp, flag);
```

### 3.2 Functions

- Function names must clearly describe behavior
- Use verb-based naming

**Good:**

```ts
(getUserById, calculateTotalPrice, validateEmail);
```

**Bad:**

```ts
(getUser, processData, handleStuff);
```

---

## 4. Code Quality Standards

### 4.1 Readability First

- Code should be understandable without external explanation
- Prefer clarity over cleverness

### 4.2 Consistency

- Follow consistent formatting, naming, and structure across the codebase

### 4.3 Avoid Duplication

- Extract repeated logic into reusable functions

---

## 5. Error Handling

- Handle all expected failure cases explicitly
- Do not silently ignore errors
- Provide meaningful error messages

**Example:**

```ts
if (!user) {
    throw new Error("User not found for given userId");
}
```

---

## 6. Testing Considerations

- Functions should be designed to be **testable in isolation**
- Avoid hidden dependencies (e.g., global state)
- Prefer pure functions where possible

---

## 7. Agent Execution Guidelines (Critical)

### 7.1 Deterministic Behavior

- Do not make assumptions when requirements are unclear
- Prefer explicit handling over implicit behavior

### 7.2 Minimal Scope Changes

- Modify only what is necessary
- Avoid refactoring unrelated code

### 7.3 Idempotency

- Ensure repeated execution does not produce unintended side effects

### 7.4 No Hallucinated Dependencies

- Do not introduce libraries, APIs, or files unless explicitly required

---

## 8. When in Doubt

- Choose clarity over brevity
- Choose explicitness over magic
- Choose maintainability over speed

---

## 9. Additional Commands
- Commands can start with command:, command, command/, /command, etc.

### 9.1 Update version history
- Check git history and look for last version commit. It can be in from chore(version): or something similar.
- Check all the changes since the last version commit.
- If user hasn't provided the new version, ask for it.
- Ask user to confirm the new version and changes to be made in version history.
- Update the version history file with the new version and changes.
- Update package.json with the new version.

### 9.2 Commit changes
- Check for any unstaged changes.
- Create a commit message with the changes.
- Commit message should be in the format of feat/fix/chore/docs/refactor/test/style/perf/build/ci/revert/release/wip/add/remove/update/fix/merge/rename/bump(scope): commit message.
- Ask user to confirm the commit message.
- Commit changes.

## Summary

The goal is to produce code that is:

- Easy to read
- Easy to test
- Easy to maintain
- Safe for automated agents to modify
