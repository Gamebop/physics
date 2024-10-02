import playcanvasConfig from '@playcanvas/eslint-config';
import babelParser from '@babel/eslint-parser';
import globals from 'globals';

export default [
    ...playcanvasConfig,
    {
        files: ['**/*.js', '**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            parser: babelParser,
            parserOptions: {
                requireConfigFile: false
            },
            globals: {
                ...globals.browser,
                ...globals.mocha,
                ...globals.node,
                'Jolt': 'readonly',
                '$_DEBUG': 'readonly',
                '$_VERSION': 'readonly',
                '$_JOLT_VERSION': 'readonly'
            }
        },
        rules: {
            'import/order': 'off',
            'no-eval': 'off',
            'no-new-wrappers': 'off',
            'jsdoc/check-tag-names': [
                'error',
                {
                    'definedTags': [
                        'defaultValue',
                        'category',
                        'group',
                        'hidden',
                        'import'
                    ]
                }
            ]
        }
    },
    {
        files: ['test/**/*.mjs'],
        rules: {
            'no-unused-expressions': 'off',
            'prefer-arrow-callback': 'off', // Mocha uses function callbacks
            'no-var': 'error',
            'quotes': ['error', 'single']
        }
    }
];
