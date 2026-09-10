/**
 * storage.ts
 *
 * localStorage への読み書きと、アプリ全体の状態(既読集合・最後に読んだ話数・
 * 並び順・カラーテーマ・話数カウント・検索文字列・画面状態)の保持を担う。
 */

import { Episode, LoadState, SortOrder, StoredState, Theme } from './types/types.js'

/** アプリの状態をまとめて保存する localStorage のキー。 */
export const STORAGE_KEY = 'dka-index'

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
 */
export function persistState (): void {
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
export let DATA: Episode[] = []

/** DATA を更新する。 */
export function setData (episodes: Episode[]): void {
  DATA = episodes
}

/** 現在の既読話数の集合(起動時に localStorage から読み込む)。 */
export const readSet: Set<number> = new Set(initialState.readNums)

/**
 * 指定した話数を既読としてマークする。
 *
 * @param num 既読にする話数
 */
export function markRead (num: number): void {
  readSet.add(num)
}

/** 最後に開いた話数(起動時に localStorage から読み込む)。 */
export let lastReadNum: number | null = initialState.lastReadNum

/** lastReadNum を更新する。 */
export function setLastReadNum (num: number | null): void {
  lastReadNum = num
}

/** 現在の並び順(起動時に localStorage から読み込む。デフォルトは新しい順)。 */
export let sortOrder: SortOrder = initialState.sortOrder

/** sortOrder を更新する。 */
export function setSortOrder (order: SortOrder): void {
  sortOrder = order
}

/** 現在のカラーテーマ(起動時に localStorage から読み込む)。 */
export let currentTheme: Theme = initialState.theme

/** currentTheme を更新する。 */
export function setCurrentTheme (theme: Theme): void {
  currentTheme = theme
}

/** 前回API取得時点での話数。今回の取得結果と比較し、増えていれば更新通知を出す。 */
export let lastKnownCount: number | null = initialState.lastKnownCount

/** lastKnownCount を更新する。 */
export function setLastKnownCount (count: number | null): void {
  lastKnownCount = count
}

/**
 * 現在の検索文字列。
 */
export let searchQuery = ''

/** searchQuery を更新する。 */
export function setSearchQuery (q: string): void {
  searchQuery = q
}

/** 画面の状態。起動直後は読み込み中。 */
export let loadState: LoadState = 'loading'

/** loadState を更新する。 */
export function setLoadState (state: LoadState): void {
  loadState = state
}

/** 取得に失敗した場合のエラーメッセージ。 */
export let loadErrorMessage = ''

/** loadErrorMessage を更新する。 */
export function setLoadErrorMessage (message: string): void {
  loadErrorMessage = message
}
