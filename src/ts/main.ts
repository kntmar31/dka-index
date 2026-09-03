/**
 * main.ts
 *
 * 「堀さんと宮村くん 全話リスト」アプリのメインロジック。
 * - Google Apps Script API からのデータ取得(読み込み中/エラー状態の表示を含む)
 * - 既読管理・最後に読んだ話数・並び順の記憶(localStorage、単一キーにまとめて保存)
 * - 検索・並び替え
 * を担う。
 */

import { Episode } from './data.js'

/**
 * 20話ごとにグループ化した結果の1グループ。
 */
interface EpisodeGroup {
  /** このグループの先頭話数(例: 1, 21, 41 ...) */
  start: number
  /** グループに含まれる話のリスト(渡された順序をそのまま保持する) */
  items: Episode[]
}

/** 話数の並び順。'asc' = 古い順(番号が若い順)、'desc' = 新しい順。 */
type SortOrder = 'asc' | 'desc'

/** 画面の状態。読み込み中 / 取得失敗 / 表示可能。 */
type LoadState = 'loading' | 'error' | 'ready'

/** カラーテーマ。'default' = 通常配色、'alt' = 切り替え後の配色。 */
type Theme = 'default' | 'alt'

/**
 * localStorage に保存する状態のかたち。
 * 既読話数・最後に読んだ話数・並び順・カラーテーマを1つのキーにまとめて保存する
 * (localStorageのキーを増やしすぎないため)。
 *
 * 保存例:
 * {
 *   "readNums": [1, 2, 3, 42, 43, 44, 45, 46, 47],
 *   "lastReadNum": 47,
 *   "sortOrder": "desc",
 *   "theme": "default"
 * }
 */
interface StoredState {
  /** 既読になっている話数の一覧 */
  readNums: number[]
  /** 最後に開いた話数(未保存の場合は null) */
  lastReadNum: number | null
  /** 並び順 */
  sortOrder: SortOrder
  /** カラーテーマ */
  theme: Theme
}

/** アプリの状態をまとめて保存する localStorage のキー。 */
const STORAGE_KEY = 'dka-index'

/**
 * GAS_API_URL は deploy 時に build.js によって書き換えられるプレースホルダー。
 * リポジトリの GAS_API_URL シークレットの値がここに注入される。
 * コミットされたソースコードには実際のURLを含めない。
 */
const GAS_API_URL = '__GAS_API_URL__'

/**
 * localStorage から保存済みの状態を読み込む。
 * 値が壊れている・取得できない場合はデフォルト値を返す(例外を投げない)。
 *
 * @returns 読み込んだ(または既定の)状態
 */
function loadStoredState (): StoredState {
  const fallback: StoredState = { readNums: [], lastReadNum: null, sortOrder: 'desc', theme: 'default' }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return fallback

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return fallback

    const obj = parsed as Partial<StoredState>
    const readNums = Array.isArray(obj.readNums)
      ? obj.readNums.filter((n): n is number => typeof n === 'number')
      : []
    const lastReadNum = typeof obj.lastReadNum === 'number' ? obj.lastReadNum : null
    const sortOrder: SortOrder = obj.sortOrder === 'asc' ? 'asc' : 'desc'
    const theme: Theme = obj.theme === 'alt' ? 'alt' : 'default'

    return { readNums, lastReadNum, sortOrder, theme }
  } catch {
    return fallback
  }
}

/**
 * 現在のアプリ状態(既読集合・最後に読んだ話数・並び順)を
 * 1つの localStorage キーにまとめて保存する。
 * プライベートブラウジングなどで保存に失敗しても黙って諦める(UIを壊さない)。
 */
function persistState (): void {
  try {
    const state: StoredState = {
      readNums: Array.from(readSet),
      lastReadNum,
      sortOrder,
      theme: currentTheme
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorageが使えない環境では何もしない
  }
}

/** 起動時に読み込んだ保存済み状態。 */
const initialState = loadStoredState()

/** アプリが現在表示に使っているデータ。取得完了までは空。 */
let DATA: Episode[] = []

/** 現在の既読話数の集合(起動時に localStorage から読み込む)。 */
const readSet: Set<number> = new Set(initialState.readNums)

/** 最後に開いた話数(起動時に localStorage から読み込む)。 */
let lastReadNum: number | null = initialState.lastReadNum

/** 現在の並び順(起動時に localStorage から読み込む。デフォルトは新しい順)。 */
let sortOrder: SortOrder = initialState.sortOrder

/** 現在のカラーテーマ(起動時に localStorage から読み込む)。 */
let currentTheme: Theme = initialState.theme

/** 画面の状態。起動直後は読み込み中。 */
let loadState: LoadState = 'loading'

/** 取得に失敗した場合のエラーメッセージ。 */
let loadErrorMessage = ''

/** 起動後、次に読むべき話数への自動スクロールを既に行ったかどうか。 */
let hasScrolledToLastRead = false

const mainEl = document.getElementById('main') as HTMLElement
const countEl = document.getElementById('count') as HTMLElement
const searchEl = document.getElementById('search') as HTMLInputElement
const sortAscBtn = document.getElementById('sortAsc') as HTMLButtonElement
const sortDescBtn = document.getElementById('sortDesc') as HTMLButtonElement

/**
 * 指定した話数を既読としてマークする。
 * 保存は呼び出し側で persistState() をまとめて行う(1クリックにつき書き込み1回にするため)。
 *
 * @param num 既読にする話数
 */
function markRead (num: number): void {
  readSet.add(num)
}

/**
 * 話一覧のクリックイベントハンドラ。
 * クリックされたリンクの話数を既読にし、その場で見た目(is-read)を更新する。
 * あわせて「最後に開いた話数」を更新し、まとめて localStorage に保存する。
 * これにより次回開いたときにその続きまで自動スクロールできるようにする。
 * タッチデバイスでは :hover が残り続ける「スタックしたhover」対策として、
 * 既読化したあとにフォーカスも明示的に外す(blur)。
 *
 * @param e クリックイベント
 */
function handleListClick (e: MouseEvent): void {
  const target = e.target as HTMLElement
  const link = target.closest('a.row')
  if (link === null) return

  const numAttr = link.getAttribute('data-num')
  const num = numAttr !== null ? parseInt(numAttr, 10) : NaN
  if (!Number.isNaN(num)) {
    markRead(num)
    lastReadNum = num
    persistState()
    link.classList.add('is-read')
  }
  if (link instanceof HTMLElement) {
    link.blur()
  }
}

/**
 * 並び順を切り替え、保存し、ボタンの見た目(active状態)を更新したうえで再描画する。
 *
 * @param order 新しい並び順
 */
function setSortOrder (order: SortOrder): void {
  sortOrder = order
  persistState()
  sortAscBtn.classList.toggle('active', order === 'asc')
  sortDescBtn.classList.toggle('active', order === 'desc')
  render(searchEl.value)
}

/**
 * 番号昇順のリストを20話ごとのグループに分割する。
 * 呼び出し側は items が常に num の昇順であることを保証する必要がある。
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
 * 読み込み中の状態を main 内に表示する。画面中央にカードを表示する。
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
 * 取得失敗の状態を main 内に表示する。エラー内容と再読み込みボタンを出す。
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
 * 検索中はグループ分けを行わず、単一のフラットなリストとして表示する。
 *
 * @param filterText 検索ボックスの入力値
 */
function renderList (filterText: string): void {
  const q = filterText.trim().toLowerCase()
  const filtered = q.length > 0
    ? DATA.filter((it) => String(it.num).includes(q) || it.title.toLowerCase().includes(q))
    : DATA

  countEl.textContent = q.length > 0 ? String(filtered.length) + ' 件' : String(DATA.length) + ' 話'

  if (filtered.length === 0) {
    mainEl.innerHTML =
      '<div class="empty">「' + escapeHtml(filterText) + '」に一致する話は見つかりませんでした。</div>'
    return
  }

  // filtered は常に num 昇順。グループ分けは昇順ベースで作り、
  // 新しい順のときは「グループの並び」と「グループ内の並び」を両方逆にする。
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
 * @param filterText 検索ボックスの入力値(一覧表示時のみ使用)
 */
function render (filterText: string): void {
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

/**
 * 「次に読むべき話数」の行までスムーズにスクロールする。
 * 「次」は現在の並び順(表示順)に沿って決める。
 * - 新しい順(desc)で読み進めている場合、次は「話数 - 1」(下へ読み進む)
 * - 古い順(asc)で読み進めている場合、次は「話数 + 1」(上へ読み進む)
 * 起動後1度だけ実行する(検索・並び替えのたびには行わない)。
 * 次の話数がリストに存在しない場合(読み進めた末端に達している場合など)は何もしない。
 */
function scrollToNextUnread (): void {
  if (hasScrolledToLastRead) return
  hasScrolledToLastRead = true

  if (lastReadNum === null) return

  const nextNum = sortOrder === 'desc' ? lastReadNum - 1 : lastReadNum + 1
  const target = mainEl.querySelector('[data-num="' + String(nextNum) + '"]')
  if (target === null) return

  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

/**
 * Google Apps Script API から話数リストを取得する。
 * 成功すれば DATA にセットして一覧を表示し、失敗すればエラー状態を表示する。
 */
async function loadLiveData (): Promise<void> {
  try {
    const res = await fetch(GAS_API_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error('HTTPエラー: ' + String(res.status))

    const rawData: unknown = await res.json()

    if (typeof rawData !== 'object' || rawData === null) {
      throw new Error('取得したデータの形式が想定外です。')
    }

    const data = rawData as {
      count?: number
      episodes?: Array<{ num?: unknown, title?: unknown, url?: unknown }>
    }

    if (data.episodes === undefined || !Array.isArray(data.episodes) || typeof data.count !== 'number') {
      throw new Error('取得したデータの形式が想定外です。')
    }
    if (data.episodes.length === 0) {
      throw new Error('取得した話数が0件でした。')
    }

    const episodes: Episode[] = data.episodes
      .filter(
        (ep): ep is { num: number, title: string, url: string } =>
          typeof ep.num === 'number' && typeof ep.title === 'string' && typeof ep.url === 'string'
      )
      .sort((a, b) => a.num - b.num)

    if (episodes.length === 0) {
      throw new Error('取得したデータを解釈できませんでした。')
    }

    // 成功: データをセットして一覧表示に切り替える
    DATA = episodes
    loadState = 'ready'

    // 既読情報を新しい話数リストに合わせて整合させる。
    // 存在しない番号が既読セットに残っていれば取り除いて保存し直す。
    const validNums = new Set(episodes.map((ep) => ep.num))
    let readSetChanged = false
    readSet.forEach((n) => {
      if (!validNums.has(n)) {
        readSet.delete(n)
        readSetChanged = true
      }
    })
    if (readSetChanged) {
      persistState()
    }

    render(searchEl.value)
    scrollToNextUnread()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    loadState = 'error'
    loadErrorMessage = message
    render(searchEl.value)
  }
}

/**
 * 指定したテーマを <html> の data-theme 属性に反映する。
 *
 * @param theme 適用するテーマ
 */
function applyTheme (theme: Theme): void {
  if (theme === 'alt') {
    document.documentElement.setAttribute('data-theme', 'alt')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

/**
 * カラーテーマ切り替えボタンの初期化。
 * 起動時に保存済みのテーマを反映し、クリックのたびにテーマをトグルして
 * <html> の data-theme 属性に反映・localStorage に保存する。
 */
function initThemeToggle (): void {
  applyTheme(currentTheme)

  const btn = document.querySelector('.theme-toggle')
  if (btn === null) return
  btn.addEventListener('click', () => {
    currentTheme = currentTheme === 'alt' ? 'default' : 'alt'
    applyTheme(currentTheme)
    persistState()
  })
}

/**
 * アプリの初期化処理。
 * イベントリスナーの登録、読み込み中表示、ライブデータの取得を行う。
 */
function init (): void {
  mainEl.addEventListener('click', handleListClick)
  searchEl.addEventListener('input', (e) => { render((e.target as HTMLInputElement).value) })
  sortAscBtn.addEventListener('click', () => { setSortOrder('asc') })
  sortDescBtn.addEventListener('click', () => { setSortOrder('desc') })
  initThemeToggle()

  sortAscBtn.classList.toggle('active', sortOrder === 'asc')
  sortDescBtn.classList.toggle('active', sortOrder === 'desc')

  render(searchEl.value) // 読み込み中表示を出す

  void loadLiveData()
}

init()
