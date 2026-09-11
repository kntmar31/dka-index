/**
 * settings.ts
 *
 * 設定パネル(フローティング表示)の初期化を担う。
 * ヘッダーの歯車ボタン(.settings-toggle)を押すと開く。
 *
 * 設定項目:
 * - テーマカラーの選択(色見本をタップして直接切り替える)
 * - 最新話が更新されている時に自動でその話まで飛ぶかどうか
 * - すべての既読履歴をリセット
 */

import { render } from './render.js'
import {
  currentTheme,
  jumpToLatestOnUpdate,
  persistState,
  readSet,
  searchQuery,
  setJumpToLatestOnUpdate,
  setLastReadNum
} from './storage.js'
import { setTheme } from './theme.js'
import { Theme } from './types/types.js'

/**
 * 設定パネルを初期化する。
 * 開閉・テーマ選択・トグル・リセットボタンのイベントをまとめて登録する。
 */
export function initSettings (): void {
  const toggleBtn = document.getElementById('settingsToggle')
  const overlayEl = document.getElementById('settingsOverlay')
  const closeBtn = document.getElementById('settingsClose')
  const jumpToggleEl = document.getElementById('jumpToLatestToggle')
  const resetBtn = document.getElementById('resetReadHistoryBtn')
  if (toggleBtn === null || overlayEl === null) return

  // ネストした関数(クロージャ)の中でも非nullとして扱えるよう、
  // 明示的な非null型で束ね直しておく。
  const overlay: HTMLElement = overlayEl

  const swatches = Array.from(document.querySelectorAll('.settings-swatch'))

  /**
   * 現在のテーマに合わせて、色見本の選択状態(枠線)を更新する。
   */
  function updateSwatchSelection (): void {
    swatches.forEach((swatch) => {
      swatch.classList.toggle('is-selected', swatch.getAttribute('data-theme') === currentTheme)
    })
  }

  /**
   * 設定パネルを開く。開くたびに現在の状態(テーマ・トグル)を反映し直す。
   * パネル表示中は、背後の一覧がスクロールできてしまうと使い勝手が悪いため、
   * document.body に overflow: hidden を適用して背景のスクロールを止める。
   */
  function openSettings (): void {
    overlay.classList.add('is-open')
    overlay.setAttribute('aria-hidden', 'false')
    document.body.style.overflow = 'hidden'
    updateSwatchSelection()
    if (jumpToggleEl instanceof HTMLInputElement) {
      jumpToggleEl.checked = jumpToLatestOnUpdate
    }
  }

  function closeSettings (): void {
    overlay.classList.remove('is-open')
    overlay.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = ''
  }

  toggleBtn.addEventListener('click', openSettings)

  if (closeBtn !== null) {
    closeBtn.addEventListener('click', closeSettings)
  }

  // 背景(半透明の部分)をクリックしたら閉じる。パネル自体のクリックでは閉じない。
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeSettings()
    }
  })

  swatches.forEach((swatch) => {
    swatch.addEventListener('click', () => {
      const theme = swatch.getAttribute('data-theme')
      if (theme === 'amber' || theme === 'lime') {
        setTheme(theme as Theme)
        updateSwatchSelection()
      }
    })
  })

  if (jumpToggleEl instanceof HTMLInputElement) {
    jumpToggleEl.addEventListener('change', () => {
      setJumpToLatestOnUpdate(jumpToggleEl.checked)
      persistState()
    })
  }

  if (resetBtn !== null) {
    resetBtn.addEventListener('click', () => {
      const confirmed = window.confirm('既読履歴をすべてリセットします。よろしいですか?')
      if (!confirmed) return

      readSet.clear()
      setLastReadNum(null)
      persistState()
      render(searchQuery)
    })
  }
}
