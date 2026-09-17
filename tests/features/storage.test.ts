/**
 * storage.test.ts
 *
 * 状態のsetter関数と persistState() の挙動をテストする。
 * 起動時の localStorage 読み込み(loadStoredState)はモジュール読み込み時に
 * 1度だけ実行されるプライベートな処理なので、ここでは対象にしていない。
 */

import {
  markRead,
  persistState,
  readSet,
  setCurrentTheme,
  setJumpToLatestOnUpdate,
  setLastKnownCount,
  setLastReadNum,
  setSortOrder,
  STORAGE_KEY
} from '../../src/ts/features/storage.js'

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
    readSet.clear()
  })

  it('markRead()でreadSetに話数が追加される', () => {
    markRead(5)
    expect(readSet.has(5)).toBe(true)
  })

  it('persistState()で現在の状態がlocalStorageに保存される', () => {
    setLastReadNum(42)
    setSortOrder('asc')
    setCurrentTheme('lime')
    setLastKnownCount(613)
    setJumpToLatestOnUpdate(true)
    markRead(1)
    markRead(2)

    persistState()

    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const saved: unknown = JSON.parse(raw as string)
    expect(saved).toEqual({
      readNums: [1, 2],
      lastReadNum: 42,
      sortOrder: 'asc',
      theme: 'lime',
      lastKnownCount: 613,
      jumpToLatestOnUpdate: true
    })
  })

  it('localStorageへの書き込みに失敗しても例外を投げない', () => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => {
      throw new Error('quota exceeded')
    }
    expect(() => persistState()).not.toThrow()
    Storage.prototype.setItem = original
  })
})
