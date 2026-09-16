/**
 * gas.test.ts
 *
 * fetchEpisodesAndCount() の正常系・異常系を fetch をモックして検証する。
 */

import { fetchEpisodesAndCount } from './gas.js'

function mockFetchResolvedValue (value: { ok: boolean, status?: number, json?: () => Promise<unknown> }): void {
  global.fetch = jest.fn().mockResolvedValue(value) as unknown as typeof fetch
}

describe('fetchEpisodesAndCount', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('正常なレスポンスを話数昇順に整列して返す', async () => {
    mockFetchResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        count: 3,
        episodes: [
          { num: 2, title: 'b', url: 'https://example.com/2' },
          { num: 1, title: 'a', url: 'https://example.com/1' },
          { num: 3, title: 'c', url: 'https://example.com/3' }
        ]
      })
    })

    const result = await fetchEpisodesAndCount()

    expect(result.count).toBe(3)
    expect(result.episodes.map((e) => e.num)).toEqual([1, 2, 3])
  })

  it('HTTPエラー時は例外を投げる', async () => {
    mockFetchResolvedValue({ ok: false, status: 500 })
    await expect(fetchEpisodesAndCount()).rejects.toThrow('HTTPエラー: 500')
  })

  it('episodesが無い場合は例外を投げる', async () => {
    mockFetchResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ count: 0 })
    })
    await expect(fetchEpisodesAndCount()).rejects.toThrow('取得したデータの形式が想定外です。')
  })

  it('episodesが0件の場合は例外を投げる', async () => {
    mockFetchResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ count: 0, episodes: [] })
    })
    await expect(fetchEpisodesAndCount()).rejects.toThrow('取得した話数が0件でした。')
  })

  it('形式が不正なepisode要素は除外し、全滅した場合は例外を投げる', async () => {
    mockFetchResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        count: 1,
        episodes: [{ num: 'not-a-number', title: 'a', url: 'https://example.com/1' }]
      })
    })
    await expect(fetchEpisodesAndCount()).rejects.toThrow('取得したデータを解釈できませんでした。')
  })
})
