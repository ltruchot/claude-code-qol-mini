// Style rules owned by oxfmt or by the 50-line law
export const OFF_STYLE: Record<string, "off"> = {
  "eslint/sort-imports": "off", // oxfmt sorts imports
  "eslint/sort-keys": "off", // semantic key order
  "eslint/one-var": "off",
  "eslint/func-style": "off",
  "eslint/id-length": "off", // `p`, `s`, `i` in tiny scopes
  "eslint/no-magic-numbers": "off",
  "eslint/no-ternary": "off",
  "eslint/curly": "off", // braces would blow the 50-line law
  "eslint/max-statements": "off",
  "eslint/max-params": "off",
  "eslint/capitalized-comments": "off",
  "eslint/init-declarations": "off",
  "eslint/prefer-destructuring": "off",
  "eslint/no-underscore-dangle": "off", // `_i` unused param
  "eslint/prefer-named-capture-group": "off",
  "eslint/require-unicode-regexp": "off", // `u` changes escaping rules
  "unicorn/no-await-expression-member": "off",
  "node/no-sync": "off", // sync fs in scripts and root lookup
  "eslint/no-inline-comments": "off", // reasons live next to config values
  "unicorn/switch-case-braces": "off", // two lines per case, 50-line law
  "unicorn/number-literal-case": "off", // oxfmt lowercases hex digits
  "typescript/promise-function-async": "off", // fights require-await on thin wrappers
};
