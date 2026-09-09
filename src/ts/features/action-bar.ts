/**
 * action-bar.ts
 *
 * 画面下部に常時表示するクイックアクションバー(並び替え/次の未読話/一番上へ/
 * 一番下へ/検索)の初期化・表示を担う。以前のFAB(開閉ボタン+開閉式サブメニュー)は
 * 廃止し、常に表示された各ボタンを直接タップ/クリックする形に変更した。
 * テーマ切り替えはヘッダーの丸いボタン(.theme-toggle、theme.ts側)のみで行う。
 */

import { render } from './render.js'
import { scrollToNextUnreadEpisode } from './scroll.js'
import { persistState, searchQuery, setSearchQuery, setSortOrder as storeSortOrder, sortOrder } from './storage.js'
import { SortOrder } from './types/types.js'

/**
 * アクションバーの並び替えボタンのラベルを、現在の並び順に合わせて更新する。
 * 他のボタン(「一番上へ」「次の話し」など)がタップした時に起きる動作を
 * 示しているのに合わせ、こちらも「今どちらか」ではなく「タップすると
 * 切り替わる先」を示す(現在desc(新しい順)なら次はasc(古い順)になるので「古い順」)。
 */
export function updateSortActionLabel (): void {
  const label = document.querySelector('.fab-item[data-action="sort"] .fab-item-label')
  if (label === null) return
  label.textContent = sortOrder === 'desc' ? '古い順' : '新しい順'
}

/**
 * 並び順を切り替え、保存し、アクションバーのラベルを更新したうえで再描画する。
 * 再描画後、スクロール位置を次に読むべき話数に合わせ直す(「次の話し」ボタンと同じ位置)。
 *
 * @param order 新しい並び順
 */
function changeSortOrder (order: SortOrder): void {
  storeSortOrder(order)
  persistState()
  updateSortActionLabel()
  render(searchQuery)

  scrollToNextUnreadEpisode('smooth')
}

/**
 * 画面下部に常時表示するクイックアクションバーをフェード+スライドインで表示する。
 * ページの読み込みが完了したあとに1度だけ呼び出し、以降は自動で消えることなく
 * 表示され続ける。
 */
export function showActionBar (): void {
  const bar = document.getElementById('actionBar')
  if (bar === null) return

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      bar.classList.add('is-visible')
    })
  })
}

/**
 * アクションバーの検索ボタンの開閉を初期化する。
 * 開くと他のボタンが隠れて検索欄が現れ、ボタン自体が閉じるボタンに変わる。
 * カード(背景)自体の横幅はCSSで固定してあるため、ボタンを隠しても縮まず、
 * 空いたスペースに検索欄が伸びる形になる。
 * 閉じると検索文字列をクリアし、一覧の表示も元(フィルタなし)に戻す。
 */
function initActionBarSearch (): void {
  const CLOSE_ICON = '\u2715' // ✕
  const SEARCH_ICON_HTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'

  const cardEl = document.getElementById('actionBarCard')
  const searchBtnEl = document.getElementById('actionBarSearchBtn')
  const barSearchInputEl = document.getElementById('actionBarSearchInput')
  if (cardEl === null || searchBtnEl === null || barSearchInputEl === null) return
  if (!(barSearchInputEl instanceof HTMLInputElement)) return

  const iconEl = searchBtnEl.querySelector('.fab-item-icon')
  const labelEl = searchBtnEl.querySelector('.fab-item-label')
  if (iconEl === null || labelEl === null) return

  // ネストした関数(クロージャ)の中でも非nullとして扱えるよう、
  // 明示的な非null型で束ね直しておく。
  const card: HTMLElement = cardEl
  const searchBtn: HTMLElement = searchBtnEl
  const barSearchInput: HTMLInputElement = barSearchInputEl
  const icon: Element = iconEl
  const label: Element = labelEl

  function openSearch (): void {
    card.classList.add('is-search-open')
    barSearchInput.value = searchQuery
    icon.innerHTML = CLOSE_ICON
    label.textContent = '閉じる'
    barSearchInput.focus()
  }

  function closeSearch (): void {
    card.classList.remove('is-search-open')
    icon.innerHTML = SEARCH_ICON_HTML
    label.textContent = '検索'

    // 閉じたら検索文字列もクリアし、一覧の表示を元(フィルタなし)に戻す。
    barSearchInput.value = ''
    setSearchQuery('')
    render(searchQuery)
  }

  searchBtn.addEventListener('click', () => {
    if (card.classList.contains('is-search-open')) {
      // クリック(タップ)完了の直後は :active がまだ残っていることがあり、
      // このタイミングで is-search-open を外すと、切り替わった直後の
      // 検索アイコンのボタンに一瞬だけ通常の:active背景色が付いて見えることがある。
      // 1フレーム遅らせることで、:active が完全に解除されてから切り替えるようにする。
      window.requestAnimationFrame(() => {
        closeSearch()
      })
    } else {
      openSearch()
    }
  })

  barSearchInput.addEventListener('input', () => {
    setSearchQuery(barSearchInput.value)
    render(searchQuery)
  })
}

/**
 * 画面下部に常時表示するクイックアクションバー(並び替え/次の未読話/一番上へ/
 * 一番下へ/検索)を初期化する。以前のFAB(開閉ボタン+開閉式サブメニュー)は廃止し、
 * 常に表示された各ボタンを直接タップ/クリックする形に変更した。
 * テーマ切り替えはヘッダーの丸いボタン(.theme-toggle)のみで行う
 * (以前はこのアクションバーにもテーマ変更ボタンがあったが撤去した)。
 *
 * 検索ボタンだけは他のボタンと違い、単発の動作ではなく状態を持つ切り替え式にしている。
 * タップすると他のボタンが隠れて検索欄が現れ、ボタン自体も閉じるボタンに変わる。
 * もう一度押すと元のボタン一覧に戻り、検索文字列もクリアされる
 * (ヘッダーには検索欄を置いていないため、検索はこのアクションバーが唯一の入り口になる)。
 */
export function initActionBar (): void {
  function scrollToTop (): void {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function scrollToBottom (): void {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  function actionBarScrollToNextUnread (): void {
    scrollToNextUnreadEpisode('smooth')
  }

  function actionBarToggleSort (): void {
    changeSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  document.querySelectorAll('.fab-item[data-action]:not([data-action="search"])').forEach((item) => {
    item.addEventListener('click', () => {
      const action = item.getAttribute('data-action')
      if (action === 'top') scrollToTop()
      if (action === 'bottom') scrollToBottom()
      if (action === 'next') actionBarScrollToNextUnread()
      if (action === 'sort') actionBarToggleSort()
    })
  })

  initActionBarSearch()
}
