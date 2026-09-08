/**
 * main.ts
 *
 * 「堀さんと宮村くん 全話リスト」アプリのメインロジック。
 * - Google Apps Script API からのデータ取得(読み込み中/エラー状態の表示を含む)
 * - 既読管理・最後に読んだ話数・並び順・話数カウントの記憶(localStorage、単一キーにまとめて保存)
 * - 検索・並び替え(画面下部のアクションバーから操作する)
 * - 画面下部に常時表示するクイックアクションバー(テーマ/並び替え/次の未読話/一番上へ/
 *   一番下へ/検索)
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

/** カラーテーマ。'amber' = 通常配色、'lime' = 切り替え後の配色。 */
type Theme = 'amber' | 'lime'

/**
 * localStorage に保存する状態のかたち。
 * 既読話数・最後に読んだ話数・並び順・カラーテーマ・前回取得時の話数を
 * 1つのキーにまとめて保存する(localStorageのキーを増やしすぎないため)。
 *
 * 保存例:
 * {
 *   "readNums": [1, 2, 3, 42, 43, 44, 45, 46, 47],
 *   "lastReadNum": 47,
 *   "sortOrder": "desc",
 *   "theme": "amber",
 *   "lastKnownCount": 613
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
  /** 前回API取得時点での話数(count)。未取得の場合は null */
  lastKnownCount: number | null
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
  const fallback: StoredState = {
    readNums: [],
    lastReadNum: null,
    sortOrder: 'desc',
    theme: 'amber',
    lastKnownCount: null
  }
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
    const theme: Theme = obj.theme === 'lime' ? 'lime' : 'amber'
    const lastKnownCount = typeof obj.lastKnownCount === 'number' ? obj.lastKnownCount : null

    return { readNums, lastReadNum, sortOrder, theme, lastKnownCount }
  } catch {
    return fallback
  }
}

/**
 * 現在のアプリ状態(既読集合・最後に読んだ話数・並び順・話数カウントなど)を
 * 1つの localStorage キーにまとめて保存する。
 * プライベートブラウジングなどで保存に失敗しても黙って諦める(UIを壊さない)。
 */
function persistState (): void {
  try {
    const state: StoredState = {
      readNums: Array.from(readSet),
      lastReadNum,
      sortOrder,
      theme: currentTheme,
      lastKnownCount
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

/** 前回API取得時点での話数。今回の取得結果と比較し、増えていれば更新通知を出す。 */
let lastKnownCount: number | null = initialState.lastKnownCount

/**
 * 現在の検索文字列。ヘッダーには検索欄を置かず、画面下部のアクションバーの
 * 検索欄だけで管理するため、DOM(inputの値)ではなくこの変数を単一の情報源にする。
 */
let searchQuery = ''

/** 画面の状態。起動直後は読み込み中。 */
let loadState: LoadState = 'loading'

/** 取得に失敗した場合のエラーメッセージ。 */
let loadErrorMessage = ''

/** 起動後、次に読むべき話数への自動スクロールを既に行ったかどうか。 */
let hasScrolledToLastRead = false

const headerEl = document.querySelector('header') as HTMLElement
const mainEl = document.getElementById('main') as HTMLElement

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
 * mainEl内の話数一覧(現在の表示順)の中で、指定した話数から
 * offset個ぶん前後にずれた行要素を取得する。範囲外の場合は最も近い端の行を返す。
 *
 * @param num 基準となる話数
 * @param offset ずらす件数(正の値で後ろ、負の値で前)
 * @returns 見つかった行要素。基準の話数自体が一覧に無い場合は null
 */
function getRowOffsetFrom (num: number, offset: number): Element | null {
  const rows = Array.from(mainEl.querySelectorAll('a.row[data-num]'))
  const index = rows.findIndex((row) => row.getAttribute('data-num') === String(num))
  if (index === -1) return null

  const clampedIndex = Math.min(Math.max(index + offset, 0), rows.length - 1)
  return rows[clampedIndex]
}

/**
 * 指定した話数の行を、現在の並び順に応じた見え方でスクロールする。
 * - 古い順(asc): 対象が画面の上から3番目くらいの位置に来るようにする
 *   (2つ前の話数の行をヘッダー直下に揃える)
 * - 新しい順(desc): 対象が画面の下から3番目くらいの位置に来るようにする
 *   (2つ後の話数の行を画面下端に揃える)
 * 先頭/末尾付近で2つ前後の行が無い場合は自動的にクランプされる。
 *
 * @param num スクロール先の話数
 * @param behavior スクロールの挙動('auto' = 瞬時、'smooth' = アニメーション)
 */
function scrollToEpisode (num: number, behavior: ScrollBehavior): void {
  const target = mainEl.querySelector('[data-num="' + String(num) + '"]')
  if (target === null) return

  if (sortOrder === 'asc') {
    const anchorRow = getRowOffsetFrom(num, -2)
    const el = anchorRow !== null ? anchorRow : target
    el.scrollIntoView({ behavior, block: 'start' })
  } else {
    const anchorRow = getRowOffsetFrom(num, 2)
    const el = anchorRow !== null ? anchorRow : target
    el.scrollIntoView({ behavior, block: 'end' })
  }
}

/**
 * 並び順を切り替えたあとのスクロール位置を調整する。
 * 「最後に読んだ話数」(lastReadNum)の行が、現在の並び順に応じた位置に来るようスクロールする。
 * lastReadNum が null の場合(まだ何も読んでいない場合)は画面の一番上に戻す。
 */
function restoreScrollAfterSort (): void {
  if (lastReadNum === null) {
    window.scrollTo(0, 0)
    return
  }

  scrollToEpisode(lastReadNum, 'auto')
}

/**
 * アクションバーの並び替えボタンのラベルを、現在の並び順に合わせて更新する。
 * 他のボタン(「一番上へ」「次の話し」など)がタップした時に起きる動作を
 * 示しているのに合わせ、こちらも「今どちらか」ではなく「タップすると
 * 切り替わる先」を示す(現在desc(新しい順)なら次はasc(古い順)になるので「古い順」)。
 */
function updateSortActionLabel (): void {
  const label = document.querySelector('.fab-item[data-action="sort"] .fab-item-label')
  if (label === null) return
  label.textContent = sortOrder === 'desc' ? '古い順' : '新しい順'
}

/**
 * 並び順を切り替え、保存し、アクションバーのラベルを更新したうえで再描画する。
 * 再描画後、スクロール位置を「最後に読んだ話数」に合わせ直す。
 *
 * @param order 新しい並び順
 */
function setSortOrder (order: SortOrder): void {
  sortOrder = order
  persistState()
  updateSortActionLabel()
  render(searchQuery)

  restoreScrollAfterSort()
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
 * 「最新話が更新されました」の通知を画面中央にオーバーレイ表示する。
 * main の中身を差し替えるのではなく、話数一覧の上に浮かせる形にすることで、
 * 通知が出ている間も背後に一覧が見えるようにする。
 * 見た目は読み込み中・エラー時のカード(state-card)をそのまま使い、
 * 「NEW」バッジを添える。フェード+スライドインで現れ、
 * 一定時間後にその場でフェードアウトして消える。
 */
function showUpdateAnnouncement (): void {
  const ANNOUNCEMENT_DURATION_MS = 1200
  const ANNOUNCEMENT_TRANSITION_MS = 250

  const overlay = document.createElement('div')
  overlay.className = 'update-overlay'
  overlay.innerHTML =
    '<div class="state-card">' +
    '<span class="update-badge">NEW</span>' +
    '<p class="state-text">最新話が更新されました</p>' +
    '</div>'
  document.body.appendChild(overlay)

  const card = overlay.querySelector('.state-card')
  if (card === null) return

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      card.classList.add('is-visible')
    })
  })

  window.setTimeout(() => {
    card.classList.remove('is-visible')
    card.classList.add('is-leaving')
    window.setTimeout(() => {
      overlay.remove()
    }, ANNOUNCEMENT_TRANSITION_MS)
  }, ANNOUNCEMENT_DURATION_MS)
}

/**
 * 検索文字列に応じて一覧を絞り込み、20話ごとのグループ・並び順を適用して描画する。
 * 検索中はグループ分けを行わず、単一のフラットなリストとして表示する。
 * 検索中の件数表示は、アクションバーの検索欄そばにある専用の要素に反映する。
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
 * @param filterText 検索文字列(一覧表示時のみ使用)
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
 * 現在の並び順(表示順)に沿って「次に読むべき話数」を計算する。
 * - 新しい順(desc)で読み進めている場合、次は「話数 - 1」(下へ読み進む)
 * - 古い順(asc)で読み進めている場合、次は「話数 + 1」(上へ読み進む)
 *
 * @returns 次に読むべき話数。lastReadNum が未設定の場合は null
 */
function getNextUnreadNum (): number | null {
  if (lastReadNum === null) return null
  return sortOrder === 'desc' ? lastReadNum - 1 : lastReadNum + 1
}

/**
 * 「次に読むべき話数」の行までスムーズにスクロールする。
 * 起動後1度だけ実行する(検索・並び替えのたびには行わない)。
 * 次の話数がリストに存在しない場合(読み進めた末端に達している場合など)は何もしない。
 */
function scrollToNextUnread (): void {
  if (hasScrolledToLastRead) return
  hasScrolledToLastRead = true

  const nextNum = getNextUnreadNum()
  if (nextNum === null) return
  scrollToEpisode(nextNum, 'smooth')
}

/**
 * 画面下部に常時表示するクイックアクションバーをフェード+スライドインで表示する。
 * ページの読み込みが完了したあとに1度だけ呼び出し、以降は自動で消えることなく
 * 表示され続ける。
 */
function showActionBar (): void {
  const bar = document.getElementById('actionBar')
  if (bar === null) return

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      bar.classList.add('is-visible')
    })
  })
}

/**
 * Google Apps Script API から話数リストを取得する。
 * 成功すれば DATA にセットして一覧を表示し、失敗すればエラー状態を表示する。
 * あわせて、前回取得時より話数(count)が増えていないかを確認し、
 * 増えていれば画面中央へ更新通知をオーバーレイ表示する。
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

    // 前回取得時の話数と比較し、増えていれば更新通知を出す。
    // (初回訪問など、前回値が無い場合は通知しない。今回の値を新たな基準として保存する。)
    const hasNewEpisodes = lastKnownCount !== null && data.count > lastKnownCount
    lastKnownCount = data.count

    // 既読情報を新しい話数リストに合わせて整合させる。
    // 存在しない番号が既読セットに残っていれば取り除く。
    const validNums = new Set(episodes.map((ep) => ep.num))
    readSet.forEach((n) => {
      if (!validNums.has(n)) {
        readSet.delete(n)
      }
    })

    // 既読情報のクリーンアップ・話数カウントの更新をまとめて保存する。
    persistState()

    render(searchQuery)
    scrollToNextUnread()

    if (hasNewEpisodes) {
      showUpdateAnnouncement()
    }

    showActionBar()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    loadState = 'error'
    loadErrorMessage = message
    render(searchQuery)
  }
}

/**
 * 指定したテーマを <html> の data-theme 属性に反映する。
 *
 * @param theme 適用するテーマ
 */
function applyTheme (theme: Theme): void {
  if (theme === 'lime') {
    document.documentElement.setAttribute('data-theme', 'lime')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

/**
 * カラーテーマを切り替え、反映・保存する。
 * アクションバーのテーマ切替ボタンから呼び出される。
 */
function toggleTheme (): void {
  currentTheme = currentTheme === 'lime' ? 'amber' : 'lime'
  applyTheme(currentTheme)
  persistState()
}

/**
 * 起動時に保存済みのテーマを反映し、ヘッダーのテーマ切替ボタン(丸い小さなボタン)に
 * クリックイベントを登録する。テーマの切替はこのボタンとアクションバーの
 * テーマ変更ボタンの両方から行える。
 */
function initTheme (): void {
  applyTheme(currentTheme)

  const btn = document.querySelector('.theme-toggle')
  if (btn === null) return
  btn.addEventListener('click', toggleTheme)
}

/**
 * ヘッダーの実際の高さを CSS カスタムプロパティ(--header-h)に反映する。
 * a.row の scroll-margin-top で参照し、scrollIntoView({ block: 'start' }) で
 * スクロールした際に、固定ヘッダーの下に話数の行が隠れないようにする。
 * ヘッダーの高さはレスポンシブ対応で画面幅により変わるため、リサイズ時にも呼び直す。
 */
function updateHeaderHeightVar (): void {
  document.documentElement.style.setProperty('--header-h', String(headerEl.offsetHeight) + 'px')
}

/**
 * 画面下部に常時表示するクイックアクションバー(テーマ/並び替え/次の未読話/一番上へ/
 * 一番下へ/検索)を初期化する。以前のFAB(開閉ボタン+開閉式サブメニュー)は廃止し、
 * 常に表示された各ボタンを直接タップ/クリックする形に変更した。
 *
 * 検索ボタンだけは他のボタンと違い、単発の動作ではなく状態を持つ切り替え式にしている。
 * タップすると他のボタンが隠れて検索欄が現れ、ボタン自体も閉じるボタンに変わる。
 * もう一度押すと元のボタン一覧に戻り、検索文字列もクリアされる
 * (ヘッダーには検索欄を置いていないため、検索はこのアクションバーが唯一の入り口になる)。
 */
function initActionBar (): void {
  function scrollToTop (): void {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function scrollToBottom (): void {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  function actionBarScrollToNextUnread (): void {
    const nextNum = getNextUnreadNum()
    if (nextNum === null) return
    scrollToEpisode(nextNum, 'smooth')
  }

  function actionBarToggleSort (): void {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  document.querySelectorAll('.fab-item[data-action]:not([data-action="search"])').forEach((item) => {
    item.addEventListener('click', () => {
      const action = item.getAttribute('data-action')
      if (action === 'top') scrollToTop()
      if (action === 'bottom') scrollToBottom()
      if (action === 'next') actionBarScrollToNextUnread()
      if (action === 'theme') toggleTheme()
      if (action === 'sort') actionBarToggleSort()
    })
  })

  initActionBarSearch()
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
    searchQuery = ''
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
    searchQuery = barSearchInput.value
    render(searchQuery)
  })
}

/**
 * アプリの初期化処理。
 * イベントリスナーの登録、読み込み中表示、ライブデータの取得を行う。
 */
function init (): void {
  mainEl.addEventListener('click', handleListClick)
  initTheme()
  initActionBar()
  updateSortActionLabel()

  updateHeaderHeightVar()
  window.addEventListener('resize', updateHeaderHeightVar)

  render(searchQuery) // 読み込み中表示を出す

  void loadLiveData()
}

init()
