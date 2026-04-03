## Code Review Standards

After completing any implementation, review the code for:

- Functions longer than 30 lines (likely doing too much)
- Logic duplicated more than twice (extract to utility)
- Any `any` type usage in TypeScript (replace with real types)
- Components with more than 3 props that could be grouped into an object
- Missing error handling on async operations

Run /simplify before presenting code to the user.
