import prettier from 'eslint-plugin-prettier';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

// export default [...compat.extends("airbnb-base", "prettier"), {
export default [
    ...compat.extends('prettier'),
    {
        plugins: {
            prettier,
        },

        languageOptions: {
            globals: {
                ...globals.node,
            },

            ecmaVersion: 12,
            sourceType: 'module',
        },

        rules: {
            'prettier/prettier': 'error',
            // Disallow unused variables to catch cases where error parameters are defined but not used
            'no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    args: 'after-used',
                    caughtErrors: 'all',
                    ignoreRestSiblings: false,
                },
            ],
            // Disallow variable declarations from shadowing variables declared in the outer scope
            'no-shadow': [
                'warn',
                {
                    builtinGlobals: false,
                    hoist: 'all',
                    allow: [],
                },
            ],
        },
    },
];
