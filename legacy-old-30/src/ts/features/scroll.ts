/**
 * scroll.ts
 *
 * スクロール位置の計算・実行を担う。初期表示時の自動スクロール・
 * アクションバーの「次の話し」ボタン・並び替え後のスクロール位置復元の
 * 3箇所すべてで、この共通実装を使う(挙動を完全に一致させるため)。
 */

import { lastReadNum, sortOrder } from './storage.js'

const headerEl = document.querySelector('header') as HTMLElement
const mainEl = document.getElementById('main') as HTMLElement

/** 起動後、次に読むべき話数への自動スクロールを既に行ったかどうか。 */
let hasScrolledToLastRead = false

/**
 * ヘッダーの実際の高さを CSS カスタムプロパティ(--header-h)に反映する。
 */
export function updateHeaderHeightVar (): void {
  document.documentElement.style.setProperty('--header-h', String(headerEl.offsetHeight) + 'px')
}

/**
 * 指定した話数の行を、画面の真ん中に来るようにスクロールする。
 *
 * @param num スクロール先の話数
 * @param behavior スクロールの挙動('auto' = 瞬時、'smooth' = アニメーション)
 */
export function scrollToEpisode (num: number, behavior: ScrollBehavior): void {
  const target = mainEl.querySelector('[data-num="' + String(num) + '"]')
  if (target === null) return

  target.scrollIntoView({ behavior, block: 'center' })
}

/**
 * 現在の並び順(表示順)に沿って「次に読むべき話数」を計算する。
 *
 * @returns 次に読むべき話数。lastReadNum が未設定の場合は null
 */
export function getNextUnreadNum (): number | null {
  if (lastReadNum === null) return null
  return sortOrder === 'desc' ? lastReadNum - 1 : lastReadNum + 1
}

/**
 * 「次に読むべき話数」の行までスクロールする(画面の真ん中に来るようにする)。
 *
 * @param behavior スクロールの挙動('auto' = 瞬時、'smooth' = アニメーション)
 */
export function scrollToNextUnreadEpisode (behavior: ScrollBehavior): void {
  const nextNum = getNextUnreadNum()
  if (nextNum === null) {
    window.scrollTo({ top: 0, behavior })
    return
  }
  scrollToEpisode(nextNum, behavior)
}

/**
 * 「次に読むべき話数」の行までスムーズにスクロールする。
 * 起動後1度だけ実行する(検索・並び替えのたびには行わない)。
 */
export function scrollToNextUnread (): void {
  if (hasScrolledToLastRead) return
  hasScrolledToLastRead = true

  void document.fonts.ready.then(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        updateHeaderHeightVar()
        scrollToNextUnreadEpisode('smooth')

        const vv = window.visualViewport
        if (vv === null) return

        let reflowCount = 0
        const MAX_REFLOWS = 3
        const onViewportResize = (): void => {
          reflowCount += 1
          updateHeaderHeightVar()
          scrollToNextUnreadEpisode('auto')
          if (reflowCount >= MAX_REFLOWS) {
            vv.removeEventListener('resize', onViewportResize)
          }
        }
        vv.addEventListener('resize', onViewportResize)
        window.setTimeout(() => {
          vv.removeEventListener('resize', onViewportResize)
        }, 2000)
      })
    })
  })
}
