/**
 * storage.ts
 */

import { Episode, LoadState, SortOrder, StoredState, Theme } from './types/types.js'

export const STORAGE_KEY = 'dka-index'

function loadStoredState (): StoredState {
  const fallback: StoredState = {
    readNums: [],
    lastReadNum: null,
    sortOrder: 'desc',
    theme: 'amber',
    lastKnownCount: null,
    jumpToLatestOnUpdate: false
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
    const jumpToLatestOnUpdate = obj.jumpToLatestOnUpdate === true

    return { readNums, lastReadNum, sortOrder, theme, lastKnownCount, jumpToLatestOnUpdate }
  } catch {
    return fallback
  }
}

export function persistState (): void {
  try {
    const state: StoredState = {
      readNums: Array.from(readSet),
      lastReadNum,
      sortOrder,
      theme: currentTheme,
      lastKnownCount,
      jumpToLatestOnUpdate
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorageが使えない環境では何もしない
  }
}

const initialState = loadStoredState()

export let DATA: Episode[] = []

export function setData (episodes: Episode[]): void {
  DATA = episodes
}

export const readSet: Set<number> = new Set(initialState.readNums)

export function markRead (num: number): void {
  readSet.add(num)
}

export let lastReadNum: number | null = initialState.lastReadNum

export function setLastReadNum (num: number | null): void {
  lastReadNum = num
}

export let sortOrder: SortOrder = initialState.sortOrder

export function setSortOrder (order: SortOrder): void {
  sortOrder = order
}

export let currentTheme: Theme = initialState.theme

export function setCurrentTheme (theme: Theme): void {
  currentTheme = theme
}

export let lastKnownCount: number | null = initialState.lastKnownCount

export function setLastKnownCount (count: number | null): void {
  lastKnownCount = count
}

export let searchQuery = ''

export function setSearchQuery (q: string): void {
  searchQuery = q
}

export let loadState: LoadState = 'loading'

export function setLoadState (state: LoadState): void {
  loadState = state
}

export let loadErrorMessage = ''

export function setLoadErrorMessage (message: string): void {
  loadErrorMessage = message
}

export let jumpToLatestOnUpdate: boolean = initialState.jumpToLatestOnUpdate

export function setJumpToLatestOnUpdate (value: boolean): void {
  jumpToLatestOnUpdate = value
}
