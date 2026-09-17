/**
 * scroll.test.ts
 *
 * getNextUnreadNum() の計算ロジックのみを対象にした単体テスト。
 * scroll.ts はモジュール読み込み時に header/main 要素を取得するが、
 * jsdomの初期状態では存在しないため null になる。getNextUnreadNum() はDOMに
 * 一切依存しないためこれで問題ない。
 */

import { getNextUnreadNum } from '../../src/ts/features/scroll.js'
import { setLastReadNum, setSortOrder } from '../../src/ts/features/storage.js'

describe('getNextUnreadNum', () => {
  it('lastReadNumが未設定(null)の場合はnullを返す', () => {
    setLastReadNum(null)
    expect(getNextUnreadNum()).toBeNull()
  })

  it('新しい順(desc)の場合、次はlastReadNum - 1', () => {
    setSortOrder('desc')
    setLastReadNum(10)
    expect(getNextUnreadNum()).toBe(9)
  })

  it('古い順(asc)の場合、次はlastReadNum + 1', () => {
    setSortOrder('asc')
    setLastReadNum(10)
    expect(getNextUnreadNum()).toBe(11)
  })
})
