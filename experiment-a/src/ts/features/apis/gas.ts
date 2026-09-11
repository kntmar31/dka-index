/**
 * gas.ts
 *
 * Google Apps Script API からの話数データ取得のみを担当する。
 */

import { Episode } from '../types/types.js'

const GAS_API_URL = '__GAS_API_URL__'

export interface FetchedEpisodes {
  episodes: Episode[]
  count: number
}

export async function fetchEpisodesAndCount (): Promise<FetchedEpisodes> {
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

  return { episodes, count: data.count }
}
