/**
 * render.ts
 *
 * 話数一覧・読み込み中・エラー画面の描画と、一覧クリック時の既読化処理を担う。
 */

import { Episode, EpisodeGroup } from './types/types.js'
import { DATA, loadErrorMessage, loadState, markRead, persistState, readSet, setLastReadNum, sortOrder } from './storage.js'

const mainEl = document.getElementById('main') as HTMLElement

/**
 * 話一覧のクリックイベントハンドラ。
 *
 * @param e クリックイベント
 */
export function handleListClick (e: MouseEvent): void {
  const target = e.target as HTMLElement
  const link = target.closest('a.row')
  if (link === null) return

  const numAttr = link.getAttribute('data-num')
  const num = numAttr !== null ? parseInt(numAttr, 10) : NaN
  if (!Number.isNaN(num)) {
    markRead(num)
    setLastReadNum(num)
    persistState()
    link.classList.add('is-read')
  }
  if (link instanceof HTMLElement) {
    link.blur()
  }
}

/**
 * 番号昇順のリストを20話ごとのグループに分割する。
 *
 * @param items グループ化対象の話一覧(num昇順)
 * @returns 20話ごとに区切られたグループの配列
 */
function groupData (items: Episode[]): EpisodeGroup[] {
  const groups: EpisodeGroup[] = []
  let current: EpisodeGroup | null = null

  items.forEach((it) => {
    const groupStart = Math.floor((it.num - 1) / 20) * 20 + 1
    if (current === null || current.start !== groupStart) {
      current = { start: groupStart, items: [] }
      groups.push(current)
    }
    current.items.push(it)
  })

  return groups
}

/**
 * HTML特殊文字をエスケープする。
 *
 * @param s エスケープ対象の文字列(undefined/nullは空文字扱い)
 * @returns エスケープ後の文字列
 */
function escapeHtml (s: string | undefined | null): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  const str = s ?? ''
  return str.replace(/[&<>"']/g, (c) => map[c])
}

/**
 * 1話分の行(li > a)のHTML文字列を生成する。
 *
 * @param it 描画対象の話データ
 * @returns 生成された <li> 要素のHTML文字列
 */
function renderRow (it: Episode): string {
  const readClass = readSet.has(it.num) ? ' is-read' : ''
  return (
    '<li class="entry"><a class="row' +
    readClass +
    '" href="' +
    it.url +
    '" target="_blank" rel="noopener" data-num="' +
    String(it.num) +
    '">' +
    '<span class="stamp">' +
    String(it.num) +
    '</span>' +
    '<span class="title">' +
    escapeHtml(it.title) +
    '</span>' +
    '<span class="go">開く &#8599;</span>' +
    '</a></li>'
  )
}

/**
 * 読み込み中の状態を main 内に表示する。
 */
function renderLoading (): void {
  mainEl.innerHTML =
    '<div class="state-wrap">' +
    '<div class="state-card">' +
    '<div class="spinner" aria-hidden="true"></div>' +
    '<p class="state-text">読み込み中…</p>' +
    '</div>' +
    '</div>'
}

/**
 * 取得失敗の状態を main 内に表示する。
 */
function renderError (): void {
  mainEl.innerHTML =
    '<div class="state-wrap">' +
    '<div class="state-card">' +
    '<p class="state-text">読み込みに失敗しました</p>' +
    '<p class="state-detail">' + escapeHtml(loadErrorMessage) + '</p>' +
    '<button type="button" class="retry-btn" onclick="location.reload()">再読み込み</button>' +
    '</div>' +
    '</div>'
}

/**
 * 検索文字列に応じて一覧を絞り込み、20話ごとのグループ・並び順を適用して描画する。
 *
 * @param filterText 検索文字列(searchQueryを渡す)
 */
function renderList (filterText: string): void {
  const q = filterText.trim().toLowerCase()
  const filtered = q.length > 0
    ? DATA.filter((it) => String(it.num).includes(q) || it.title.toLowerCase().includes(q))
    : DATA

  const countEl = document.getElementById('actionBarSearchCount')
  if (countEl !== null) {
    countEl.textContent = q.length > 0 ? String(filtered.length) + ' 件' : ''
  }

  if (filtered.length === 0) {
    mainEl.innerHTML =
      '<div class="empty">「' + escapeHtml(filterText) + '」に一致する話は見つかりませんでした。</div>'
    return
  }

  let html = ''

  if (q.length > 0) {
    const ordered = sortOrder === 'desc' ? [...filtered].reverse() : filtered
    html += '<div class="group"><ul class="list">' + ordered.map(renderRow).join('') + '</ul></div>'
  } else {
    let groups = groupData(filtered)
    if (sortOrder === 'desc') {
      groups = [...groups].reverse().map((g) => ({ start: g.start, items: [...g.items].reverse() }))
    }
    groups.forEach((g) => {
      const nums = g.items.map((it) => it.num)
      const rangeStart = Math.min(...nums)
      const rangeEnd = Math.max(...nums)
      html +=
        '<div class="group"><div class="group-head"><span class="num">' +
        String(rangeStart).padStart(3, '0') +
        '–' +
        String(rangeEnd).padStart(3, '0') +
        '</span><span class="range">全' +
        String(g.items.length) +
        '話</span></div><ul class="list">'
      html += g.items.map(renderRow).join('')
      html += '</ul></div>'
    })
  }

  mainEl.innerHTML = html
}

/**
 * 現在の loadState に応じて、読み込み中/エラー/一覧のいずれかを描画する。
 *
 * @param filterText 検索文字列(一覧表示時のみ使用)
 */
export function render (filterText: string): void {
  if (loadState === 'loading') {
    renderLoading()
    return
  }
  if (loadState === 'error') {
    renderError()
    return
  }
  renderList(filterText)
}
