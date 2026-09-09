/**
 * gas.ts
 *
 * Google Apps Script API からの話数データ取得のみを担当する。
 * 取得したデータをどう使うか(状態への反映・再描画・スクロールなど)は
 * 呼び出し側(main.ts)の責務とし、このファイルはAPI通信と
 * レスポンスの検証だけに専念する。
 */

import { Episode } from '../types/types.js'

/**
 * GAS_API_URL は deploy 時に build.js によって書き換えられるプレースホルダー。
 * リポジトリの GAS_API_URL シークレットの値がここに注入される。
 * コミットされたソースコードには実際のURLを含めない。
 */
const GAS_API_URL = '__GAS_API_URL__'

/** fetchEpisodesAndCount() の戻り値。 */
export interface FetchedEpisodes {
  /** num昇順に整列済みの話数一覧 */
  episodes: Episode[]
  /** APIが報告している総話数 */
  count: number
}

/**
 * Google Apps Script API から話数リストを取得し、検証したうえで返す。
 * 取得・形式ともに問題があれば Error を投げる(呼び出し側でハンドリングする)。
 *
 * @returns 検証済みの話数一覧と総数
 */
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
