/**
 * action-bar.ts
 *
 * 画面下部に常時表示するクイックアクションバー(並び替え/次の未読話/一番上へ/
 * 一番下へ/検索)の初期化・表示を担う。
 * テーマ切り替えはヘッダーの丸いボタン(.theme-toggle、theme.ts側)のみで行う。
 */

import { render } from './render.js'
import { scrollToNextUnreadEpisode } from './scroll.js'
import { persistState, searchQuery, setSearchQuery, setSortOrder as storeSortOrder, sortOrder } from './storage.js'
import { SortOrder } from './types/types.js'

/**
 * アクションバーの並び替えボタンのラベルを、現在の並び順に合わせて更新する。
 */
export function updateSortActionLabel (): void {
  const label = document.querySelector('.fab-item[data-action="sort"] .fab-item-label')
  if (label === null) return
  label.textContent = sortOrder === 'desc' ? '古い順' : '新しい順'
}

/**
 * 並び順を切り替え、保存し、アクションバーのラベルを更新したうえで再描画する。
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

    barSearchInput.value = ''
    setSearchQuery('')
    render(searchQuery)
  }

  searchBtn.addEventListener('click', () => {
    if (card.classList.contains('is-search-open')) {
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
 * 画面下部に常時表示するクイックアクションバーを初期化する。
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
