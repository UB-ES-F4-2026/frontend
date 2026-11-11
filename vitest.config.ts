import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    // Els formularis amb `userEvent.type` triguen 2–4 s per test a jsdom; amb tots els
    // fitxers en paral·lel superen els 5 s per defecte sense que hi hagi cap error.
    testTimeout: 20_000,
  },
});
