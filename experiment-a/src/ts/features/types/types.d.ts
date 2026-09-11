/**
 * types.d.ts
 *
 * アプリ全体で使う型定義のみを集めたファイル。実行時のコードは含まない。
 */

/** 1話分のデータ */
export interface Episode {
  /** 話数(1始まり) */
  num: number
  /** 話のタイトル */
  title: string
  /** 原作ページ(dka-hero.me)への絶対URL */
  url: string
}

/**
 * 20話ごとにグループ化した結果の1グループ。
 */
export interface EpisodeGroup {
  /** このグループの先頭話数(例: 1, 21, 41 ...) */
  start: number
  /** グループに含まれる話のリスト(渡された順序をそのまま保持する) */
  items: Episode[]
}

/** 話数の並び順。'asc' = 古い順(番号が若い順)、'desc' = 新しい順。 */
export type SortOrder = 'asc' | 'desc'

/** 画面の状態。読み込み中 / 取得失敗 / 表示可能。 */
export type LoadState = 'loading' | 'error' | 'ready'

/** カラーテーマ。'amber' = 通常配色、'lime' = 切り替え後の配色。 */
export type Theme = 'amber' | 'lime'

/**
 * localStorage に保存する状態のかたち。
 */
export interface StoredState {
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
  /** 最新話が更新されている時、自動でその話まで飛ぶかどうか */
  jumpToLatestOnUpdate: boolean
}
