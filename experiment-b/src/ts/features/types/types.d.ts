/**
 * types.d.ts
 */

export interface Episode {
  num: number
  title: string
  url: string
}

export interface EpisodeGroup {
  start: number
  items: Episode[]
}

export type SortOrder = 'asc' | 'desc'
export type LoadState = 'loading' | 'error' | 'ready'
export type Theme = 'amber' | 'lime'

export interface StoredState {
  readNums: number[]
  lastReadNum: number | null
  sortOrder: SortOrder
  theme: Theme
  lastKnownCount: number | null
  jumpToLatestOnUpdate: boolean
}
