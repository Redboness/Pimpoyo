import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

// Helper to convert all rules to "warn"
function warnifyRules(rules) {
  const newRules = {}
  for (const [key, value] of Object.entries(rules)) {
    if (Array.isArray(value)) {
      newRules[key] = ['warn', ...value.slice(1)]
    } else {
      newRules[key] = 'warn'
    }
  }
  return newRules
}

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...warnifyRules(reactHooks.configs.recommended.rules),
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)
