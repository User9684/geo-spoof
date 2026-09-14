import stylistic from "@stylistic/eslint-plugin";

export default [
	stylistic.configs.customize({
		indent: 4,
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
		plugins: {
			"@stylistic": stylistic,
		},
		rules: {
			"no-unused-vars": [
				"warn",
				{
					varsIgnorePattern: "^_",
					argsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
			"no-console": "off",
			"@stylistic/quotes": ["error", "double", { avoidEscape: true }],
			"@stylistic/no-tabs": "off",
			"@stylistic/indent": ["error", "tab"],
			"@stylistic/no-mixed-spaces-and-tabs": ["error", "smart-tabs"],
		},
	},
];
