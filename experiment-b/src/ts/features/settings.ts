/**
 * settings.ts
 *
 * [検証B v5] .settings-overlay(画面全体を覆う要素)を廃止し、パネル本体だけを
 * fixed配置している。画面を覆う要素がないため「パネル外側タップで閉じる」を
 * 従来のオーバーレイのクリックイベントでは実現できない。代わりに、
 * documentのpointerdownを監視し、押した位置がパネルの外側かどうかを
 * JavaScriptだけで判定して閉じる(新しい要素をDOMに追加しない)。
 *
 * さらに、外側タップで閉じる際は「閉じる」以外の副作用(リンクへの遷移・
 * 話数の既読化など)を一切起こさないようにしている。pointerdownの時点で
 * 「これは外側タップによる閉じる操作だ」と判定したら、直後に続くclickイベントを
 * capture段階でpreventDefault + stopPropagationし、リンクのデフォルト動作や
 * 他のクリックハンドラ(一覧の既読化処理など)に一切渡さないようにする。
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

  // 外側タップで閉じた直後に続くclickイベントを握りつぶすためのフラグ。
  let suppressNextClick = false

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

  // [検証B v5] パネルを覆う背景要素が無いため、documentのpointerdownを見て
  // 「開いている状態で、パネルの外側(かつ設定ボタン自体でもない)を押したか」を
  // 判定し、該当すれば閉じる。新しい要素はDOMに追加しないため、画面を覆う要素が
  // 原因だったiOS Safariの色残り問題には影響しないはず。
  document.addEventListener('pointerdown', (e) => {
    if (!overlay.classList.contains('is-open')) return
    const target = e.target as Node
    if (overlay.contains(target)) return
    if (toggleBtn.contains(target)) return

    suppressNextClick = true
    closeSettings()
  })

  // 直後に続くclickを、capture段階(他のどのハンドラより先)で完全に握りつぶす。
  // これにより、外側タップがリンクの上だった場合でも遷移せず、
  // 一覧の既読化処理なども一切実行されない。
  document.addEventListener('click', (e) => {
    if (!suppressNextClick) return
    suppressNextClick = false
    e.preventDefault()
    e.stopPropagation()
  }, true)

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
