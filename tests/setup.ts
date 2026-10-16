import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Cada prova comença amb el DOM net, sense components de la prova anterior.
afterEach(() => {
  cleanup();
});
