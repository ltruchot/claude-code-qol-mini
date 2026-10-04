// Rules that contradict this codebase's design, each with its reason
export const OFF_DESIGN: Record<string, "off"> = {
  "import/no-named-export": "off", // named exports are the convention
  "import/prefer-default-export": "off", // same
  "import/group-exports": "off", // exports sit next to their code
  "import/exports-last": "off", // same
  "import/no-relative-parent-imports": "off", // small tree, no aliases
  "import/no-nodejs-modules": "off", // Node CLI
  "import/max-dependencies": "off", // command orchestrators wire many modules
  "import/consistent-type-specifier-style": "off", // inline `type` specifiers
  "unicorn/import-style": "off", // named path imports
  "oxc/no-async-await": "off", // Node 24 target
  "oxc/no-optional-chaining": "off", // same
  "oxc/no-rest-spread-properties": "off", // same
  "typescript/prefer-readonly-parameter-types": "off", // too noisy on Maps and Buffers
  "typescript/consistent-type-definitions": "off", // `type` aliases everywhere
  "typescript/no-redeclare": "off", // zod schema + type share a name
  "eslint/no-redeclare": "off", // same
  "eslint/no-await-in-loop": "off", // sequential prompts by design
  "eslint/no-undefined": "off", // explicit absence
  "unicorn/no-null": "off", // null = read miss, undefined = not set
  "eslint/no-bitwise": "off", // file mode bits
  "eslint/no-template-curly-in-string": "off", // `${CLAUDE_` is literal on purpose
  "node/no-process-env": "off", // CLI reads env
  "node/no-top-level-await": "off", // ESM entry
  "eslint/no-continue": "off", // guard clauses in loops
  "eslint/no-use-before-define": "off", // helpers below callers
  "unicorn/no-array-callback-reference": "off", // point-free map
  "unicorn/consistent-function-scoping": "off", // closures over loop state
  "unicorn/max-nested-calls": "off", // map(filter(...)) chains
  "typescript/no-unsafe-type-assertion": "off", // JSON.parse boundaries, tests
};
