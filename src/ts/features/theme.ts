/**
 * theme.ts
 *
 * カラーテーマ(amber / lime)の切り替えを担う。
 * 以前はヘッダーの丸いボタン(.theme-toggle)でトグル(2値切り替え)していたが、
 * 設定パネルの色見本から直接選ぶ形に変更したため、トグル関数は廃止し、
 * 指定したテーマへ直接切り替える setTheme() を公開する。
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
 * 設定パネルの色見本(スウォッチ)から呼び出される。
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
