import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [".test-out/**", "node_modules/**", "out/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended
);
