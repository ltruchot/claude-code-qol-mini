// Vitest style rules that fight the vite-plus/test convention
export const OFF_TESTS: Record<string, "off"> = {
  "vitest/require-top-level-describe": "off", // flat `test` files
  "vitest/prefer-expect-assertions": "off",
  "vitest/max-expects": "off", // e2e flows chain many asserts
  "vitest/require-test-timeout": "off",
  "vitest/prefer-expect-resolves": "off",
  "vitest/no-importing-vitest-globals": "off", // imports from vite-plus/test
  "vitest/prefer-to-be-truthy": "off", // toBe(true) is stricter
  "vitest/prefer-to-be-falsy": "off",
  "vitest/require-hook": "off",
  "vitest/no-conditional-in-test": "off",
  "vitest/prefer-called-once": "off", // fights prefer-called-times
};
