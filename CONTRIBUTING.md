# Contributing to Torn Ledger

First off, thank you for considering contributing to Torn Ledger! It's people like you that make it a great tool for the Torn community.

## 🛠️ Development Setup

1. **Clone the Repo**:

    ```bash
    git clone https://github.com/tornsynthapps/blackmarketledger.git
    cd blackmarketledger
    ```

2. **Install Dependencies**:

    ```bash
    npm install
    ```

3. **Environment Variables**:
   Create a `.env.local` file in the root directory if you need to override any defaults (see `.env.production` for reference).

4. **Run Dev Server**:
    ```bash
    npm run dev
    ```

## 🧪 Testing

We use **Vitest** for unit testing and **Playwright** for end-to-end testing.

- Run unit tests: `npm test`
- Run E2E tests: `npx playwright test`

## 📜 Coding Standards

- **React & Next.js**: We use the App Router and functional components with hooks.
- **Styling**: Tailwind CSS for all styling. Follow the existing "Glassmorphism" aesthetic.
- **State Management**: Zustand (see `store/useJournal.ts`).
- **TypeScript**: Strictly typed code is required. Avoid using `any`.

## 🚀 Pull Request Process

1. Create a new branch for your feature or bugfix.
2. Ensure all tests pass.
3. Submit a PR with a clear description of the changes.
4. Once reviewed and approved, your changes will be merged into the main branch.

---

_Happy Coding!_
