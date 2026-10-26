import { defineConfig, configDefaults } from "vitest/config";

// `prive/` (private notes, ignored by git) holds archived experiments whose code is gone: never run its tests.
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, "prive/**"] }
});
