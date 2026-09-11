/**
 * theme.ts
 *
 * カラーテーマ(amber / lime)の切り替えを担う。
 */

import { currentTheme, persistState, setCurrentTheme } from './storage.js'
import { Theme } from './types/types.js'

/**
 * 指定したテーマを <html> の data-theme 属性に反映する。
 *
 * @param theme 適用するテーマ
 */
export function applyTheme (theme: Theme): void {
  if (theme === 'lime') {
    document.documentElement.setAttribute('data-theme', 'lime')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

/**
 * カラーテーマを指定したものに切り替え、反映・保存する。
 *
 * @param theme 切り替え先のテーマ
 */
export function setTheme (theme: Theme): void {
  setCurrentTheme(theme)
  applyTheme(theme)
  persistState()
}

/**
 * 起動時に保存済みのテーマを反映する。
 */
export function initTheme (): void {
  applyTheme(currentTheme)
}
