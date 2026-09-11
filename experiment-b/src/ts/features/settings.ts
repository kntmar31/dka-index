/**
 * settings.ts
 *
 * [検証B v3] .settings-overlay(画面全体を覆う要素)を廃止し、パネル本体だけを
 * fixed配置している。画面を覆う要素がないため「パネル外側タップで閉じる」を
 * 従来のオーバーレイのクリックイベントでは実現できない。代わりに、
 * document全体のクリックを監視し、クリック位置がパネルの外側かどうかを
 * JavaScriptだけで判定して閉じる(新しい要素をDOMに追加しない)。
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

  // [検証B v3] パネルを覆う背景要素が無いため、document全体のクリックを見て
  // 「開いている状態で、パネルの外側(かつ設定ボタン自体でもない)をクリックしたか」を
  // 判定し、該当すれば閉じる。新しい要素はDOMに追加しないため、画面を覆う要素が
  // 原因だったiOS Safariの色残り問題には影響しないはず。
  document.addEventListener('click', (e) => {
    if (!overlay.classList.contains('is-open')) return
    const target = e.target as Node
    if (overlay.contains(target)) return
    if (toggleBtn.contains(target)) return
    closeSettings()
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

  const themeToggleBtn = document.getElementById('themeToggleBtn')
  if (themeToggleBtn !== null) {
    themeToggleBtn.addEventListener('click', () => {
      setTheme(currentTheme === 'lime' ? 'amber' : 'lime')
      updateSwatchSelection()
    })
  }
}
