import stylistic from "@stylistic/eslint-plugin";

export default [
  stylistic.configs.customize({
    indent: 2,
    semi: true,
    jsx: true,
  }),
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        chrome: "readonly",
        browser: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
    },
  },
];
