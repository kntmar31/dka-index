/**
 * settings.ts
 *
 * [検証B v6] .settings-overlay(画面全体を覆う要素)を廃止し、パネル本体だけを
 * fixed配置している。画面を覆う要素がないため「パネル外側タップで閉じる」を
 * 従来のオーバーレイのクリックイベントでは実現できない。代わりに、
 * documentのpointerdownをcapture段階で監視し、押した位置がパネルの外側かどうかを
 * JavaScriptだけで判定して閉じる(新しい要素をDOMに追加しない)。
 *
 * v5まではpointerdownをbubble段階で監視し、続くclickイベントを握りつぶすことで
 * リンク遷移を防ごうとしていたが、それでも遷移してしまう場合があった。
 * target="_blank"のリンクは、タップの判定処理自体がclickイベントより早い
 * (またはそれとは別の)経路で新規タブを開く動作につながっている可能性があるため、
 * pointerdown自体をcapture段階(イベントがリンク要素に到達する前)で監視し、
 * 外側タップと判定した瞬間にその場でpreventDefault + stopPropagationするように
 * 変更した。保険として、従来通り続くclickイベントを握りつぶす処理も残している。
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

  // 外側タップで閉じた直後に続くclickイベントを握りつぶすためのフラグ(保険)。
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

  // [検証B v6] パネルを覆う背景要素が無いため、documentのpointerdownをcapture段階で見て
  // 「開いている状態で、パネルの外側(かつ設定ボタン自体でもない)を押したか」を判定し、
  // 該当すればその場でpreventDefault + stopPropagationしてから閉じる。
  // capture段階かつイベント自体をここで止めることで、リンク要素(<a>)本体に
  // イベントが到達する前に処理を打ち切り、target="_blank"のリンクであっても
  // 新規タブが開かないようにする狙い。
  document.addEventListener('pointerdown', (e) => {
    if (!overlay.classList.contains('is-open')) return
    const target = e.target as Node
    if (overlay.contains(target)) return
    if (toggleBtn.contains(target)) return

    e.preventDefault()
    e.stopPropagation()
    suppressNextClick = true
    closeSettings()
  }, true)

  // 保険として、直後に続くclickも、capture段階(他のどのハンドラより先)で
  // 完全に握りつぶす。
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
