/**
 * settings.ts
 *
 * 設定パネル(フローティング表示)の初期化を担う。
 *
 * [検証A] iOS Safariの上下の帯の色残り問題について、スウォッチクリック時に
 * パネルを開いたまま強制リフローを発生させることで色の再判定が起きるかを検証する。
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
 * [検証用A] iOS Safariに上下の帯の色を再判定させるための実験的な処理。
 * パネル自体は開いたまま(display: flex)でも、<body>のdisplayを一瞬none→元に戻す
 * ことで、大きなレイアウト変化(強制リフロー)を発生させ、それが
 * 色の再判定のきっかけになるかどうかを確認する。
 */
function forceReflowHack (): void {
  const original = document.body.style.display
  document.body.style.display = 'none'
  // 強制的に同期リフローを発生させる(この行自体に意味があり、削除すると効果が無くなる)。
  void document.body.offsetHeight
  document.body.style.display = original
}

/**
 * 設定パネルを初期化する。
 */
export function initSettings (): void {
  const toggleBtn = document.getElementById('settingsToggle')
  const overlayEl = document.getElementById('settingsOverlay')
  const closeBtn = document.getElementById('settingsClose')
  const jumpToggleEl = document.getElementById('jumpToLatestToggle')
  const resetBtn = document.getElementById('resetReadHistoryBtn')
  if (toggleBtn === null || overlayEl === null) return

  const overlay: HTMLElement = overlayEl

  const swatches = Array.from(document.querySelectorAll('.settings-swatch'))

  function updateSwatchSelection (): void {
    swatches.forEach((swatch) => {
      swatch.classList.toggle('is-selected', swatch.getAttribute('data-theme') === currentTheme)
    })
  }

  function openSettings (): void {
    overlay.classList.add('is-open')
    overlay.setAttribute('aria-hidden', 'false')
    updateSwatchSelection()
    if (jumpToggleEl instanceof HTMLInputElement) {
      jumpToggleEl.checked = jumpToLatestOnUpdate
    }
  }

  function closeSettings (): void {
    overlay.classList.remove('is-open')
    overlay.setAttribute('aria-hidden', 'true')
  }

  toggleBtn.addEventListener('click', openSettings)

  if (closeBtn !== null) {
    closeBtn.addEventListener('click', closeSettings)
  }

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
        forceReflowHack()
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

  const themeToggleBtn = document.getElementById('themeToggleBtn')
  if (themeToggleBtn !== null) {
    themeToggleBtn.addEventListener('click', () => {
      setTheme(currentTheme === 'lime' ? 'amber' : 'lime')
      updateSwatchSelection()
    })
  }
}
