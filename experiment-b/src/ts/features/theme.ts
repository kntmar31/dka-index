/**
 * theme.ts
 */

import { currentTheme, persistState, setCurrentTheme } from './storage.js'
import { Theme } from './types/types.js'

export function applyTheme (theme: Theme): void {
  if (theme === 'lime') {
    document.documentElement.setAttribute('data-theme', 'lime')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

export function setTheme (theme: Theme): void {
  setCurrentTheme(theme)
  applyTheme(theme)
  persistState()
}

export function initTheme (): void {
  applyTheme(currentTheme)
}
