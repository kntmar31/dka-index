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
 * 各テーマのヘッダー背景色(--color-header-bgと同じ値)。
 * <meta name="theme-color"> の更新に使う。iOS Safariなどはこのメタタグを見て
 * ステータスバー周辺の色を決めるため、テーマ切り替え時にCSSと合わせて更新する。
 */
const THEME_COLOR: Record<Theme, string> = {
  amber: '#aa3b2e',
  lime: '#000000'
}

/**
 * <meta name="theme-color"> を新しい色で更新する。
 * content 属性を書き換えるだけだと、ブラウザによっては最初に読み込んだ時点の値の
 * まま扱われ続け、テーマ切り替え後に反映されないことがある(iOS Safariで
 * ステータスバー周辺の色が切り替え前のまま残る不具合の一因と考えられる)。
 * そのため、既存のタグを一旦DOMから削除し、新しいタグとして作り直して
 * 挿入し直すことで、ブラウザに「新しく追加されたメタタグ」として
 * 認識させることを狙う。
 *
 * @param color 新しい color 値(例: '#aa3b2e')
 */
function updateThemeColorMeta (color: string): void {
  const existing = document.querySelector('meta[name="theme-color"]')
  if (existing !== null) {
    existing.remove()
  }

  const meta = document.createElement('meta')
  meta.setAttribute('name', 'theme-color')
  meta.setAttribute('content', color)
  document.head.appendChild(meta)
}

/**
 * 指定したテーマを <html> の data-theme 属性と <meta name="theme-color"> に反映する。
 *
 * @param theme 適用するテーマ
 */
export function applyTheme (theme: Theme): void {
  if (theme === 'lime') {
    document.documentElement.setAttribute('data-theme', 'lime')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }

  updateThemeColorMeta(THEME_COLOR[theme])
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
 * なお、<head>内の同期的なインラインスクリプト(index.html参照)が
 * このスクリプト実行より先に data-theme 属性と theme-color を仮反映しているため、
 * ここでの呼び出しは主に <meta name="theme-color"> の整合を取り直す意味合いが強い。
 */
export function initTheme (): void {
  applyTheme(currentTheme)
}
