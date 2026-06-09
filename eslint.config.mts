import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.mts',
						'manifest.json',
						'package.json'
					]
				},
				tsconfigRootDir: import.meta.dirname
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/unbound-method": "off",
			"@typescript-eslint/no-this-alias": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-function-type": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"no-console": "off",
			"obsidianmd/ui/sentence-case": "off",
			"obsidianmd/settings-tab/no-problematic-settings-headings": "off",
			"obsidianmd/no-static-styles-assignment": "off"
		}
	},
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
	]),
);
