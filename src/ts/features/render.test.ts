/**
 * render.test.ts
 *
 * テストのために export した groupData()・escapeHtml() の単体テスト。
 */

import { escapeHtml, groupData } from './render.js'
import { Episode } from './types/types.js'

describe('groupData', () => {
  it('20話ごとにグループ化する', () => {
    const items: Episode[] = Array.from({ length: 25 }, (_, i) => ({
      num: i + 1,
      title: `話${i + 1}`,
      url: `https://example.com/${i + 1}`
    }))

    const groups = groupData(items)

    expect(groups).toHaveLength(2)
    expect(groups[0].start).toBe(1)
    expect(groups[0].items).toHaveLength(20)
    expect(groups[1].start).toBe(21)
    expect(groups[1].items).toHaveLength(5)
  })

  it('話数が1話も無い場合は空配列を返す', () => {
    expect(groupData([])).toEqual([])
  })

  it('境界値(20話目と21話目)が正しく別グループになる', () => {
    const items: Episode[] = [
      { num: 20, title: 'a', url: 'https://example.com/20' },
      { num: 21, title: 'b', url: 'https://example.com/21' }
    ]
    const groups = groupData(items)
    expect(groups).toHaveLength(2)
    expect(groups[0].start).toBe(1)
    expect(groups[1].start).toBe(21)
  })
})

describe('escapeHtml', () => {
  it('HTML特殊文字をエスケープする', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    )
  })

  it('& を含む文字列を正しくエスケープする', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B')
  })

  it('シングルクォートをエスケープする', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s')
  })

  it('undefined/nullは空文字として扱う', () => {
    expect(escapeHtml(undefined)).toBe('')
    expect(escapeHtml(null)).toBe('')
  })

  it('特殊文字を含まない文字列はそのまま返す', () => {
    expect(escapeHtml('通常のテキスト')).toBe('通常のテキスト')
  })
})
