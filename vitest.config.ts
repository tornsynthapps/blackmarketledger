import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// Mirror the "@/*" -> "./*" path alias defined in tsconfig.json so Vitest can
// resolve imports like "@/lib/old/parser" the same way Next.js does at runtime.
export default defineConfig({
    resolve: {
        alias: {
            "@": rootDir,
        },
    },
});
