/**
 * settings.ts
 *
 * [検証A v2] .settings-overlay を復活させるが、ヘッダーの高さ分だけ上を空け、
 * ヘッダー以下の領域だけを覆う形にしている(top: var(--header-h))。
 * オーバーレイという実体が復活したので、外側タップの判定はシンプルな
 * overlay自身へのclickイベントで十分検知できるはずであり、
 * pointerdown/capture/イベント握りつぶしといった複雑な仕掛けは廃止した。
 *
 * また、パネル表示中は背後の一覧がスクロールできてしまうと使い勝手が悪いため、
 * 開いている間だけ document.body に overflow: hidden を適用し、背景のスクロールを止める。
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

  // [検証A v2] オーバーレイ(背景の半透明の部分)自体をクリックしたら閉じる。
  // オーバーレイが実体としてDOM上にあるため、この単純な判定で確実に検知できる。
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

  const themeToggleBtn = document.getElementById('themeToggleBtn')
  if (themeToggleBtn !== null) {
    themeToggleBtn.addEventListener('click', () => {
      setTheme(currentTheme === 'lime' ? 'amber' : 'lime')
      updateSwatchSelection()
    })
  }
}
