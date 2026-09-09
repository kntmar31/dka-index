/**
 * theme.ts
 *
 * カラーテーマ(amber / lime)の切り替えを担う。
 * 切り替えはヘッダーの丸いボタン(.theme-toggle)からのみ行える
 * (以前はアクションバーにもテーマ変更ボタンがあったが撤去した)。
 */

import { currentTheme, persistState, setCurrentTheme } from './storage.js'
import { Theme } from './types/types.js'

/**
 * 指定したテーマを <html> の data-theme 属性に反映する。
 *
 * @param theme 適用するテーマ
 */
function applyTheme (theme: Theme): void {
  if (theme === 'lime') {
    document.documentElement.setAttribute('data-theme', 'lime')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

/**
 * カラーテーマを切り替え、反映・保存する。
 * ヘッダーのテーマ切替ボタン(.theme-toggle)から呼び出される。
 */
function toggleTheme (): void {
  setCurrentTheme(currentTheme === 'lime' ? 'amber' : 'lime')
  applyTheme(currentTheme)
  persistState()
}

/**
 * 起動時に保存済みのテーマを反映し、ヘッダーのテーマ切替ボタン(丸い小さなボタン)に
 * クリックイベントを登録する。テーマの切替はこのボタンからのみ行える。
 */
export function initTheme (): void {
  applyTheme(currentTheme)

  const btn = document.querySelector('.theme-toggle')
  if (btn === null) return
  btn.addEventListener('click', toggleTheme)
}
