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
						'manifest.json',
						'package.json'
					]
				},
				tsconfigRootDir: process.cwd()
			},
		},
	},
	...tseslint.configs.recommendedTypeChecked,
	...obsidianmd.configs.recommended,
	{
		rules: {
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
		"eslint.config.mjs",
		"version-bump.mjs",
		"versions.json",
		"main.js", "package.json", "manifest.json", "tsconfig.json", "*.json", "data.json",
	]),
);
