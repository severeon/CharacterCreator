import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      // --- Inline styles: warn, not error ---
      // Dynamic D&D theme values (conditional CSS variable composition, runtime
      // number calculations) require inline styles. Static repeated values live
      // in .dnd-* classes in globals.css; dynamic calcs stay inline.
      "react/forbid-component-props": [
        "warn",
        { forbid: [{ propName: "style", message: "Prefer .dnd-* CSS classes for static values; inline styles are OK for dynamic/calculated values." }] },
      ],
      "react/forbid-dom-props": [
        "warn",
        { forbid: [{ propName: "style", message: "Prefer .dnd-* CSS classes for static values; inline styles are OK for dynamic/calculated values." }] },
      ],

      // --- React hooks discipline ---
      ...reactHooks.configs.recommended.rules,

      // --- React Refresh (Vite HMR) ---
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // --- TypeScript hygiene ---
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],

      // --- General quality ---
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-eval": "error",
      "prefer-const": "error",
      "no-var": "error",
    },
  }
);