---
description: Commit changes with a detailed message.
---

Follow this workflow to commit your current changes:

1.  **Check Status**: Inspect what files have changed.
    ```bash
    git status
    ```

2.  **Review Changes**: Examine the technical details of your work to write an accurate commit message.
    ```bash
    git diff
    # and if you have staged changes:
    git diff --staged
    ```

3.  **Stage All Changes**: Add all relevant files for the commit.
    ```bash
    git add .
    ```

4.  **Commit with Detailed Message**: Summarize your work. Use the `--as-rusty` flag. 
    // turbo
    ```bash
    git commit -m "[Detailed commit message based on your changes]" --as-rusty
    ```

5.  **Verify**: Log the last commit to ensure it was created correctly.
    ```bash
    git log -1
    ```
