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
 * a.row の scroll-margin-top で参照し、scrollIntoView({ block: 'start' }) で
 * スクロールした際に、固定ヘッダーの下に話数の行が隠れないようにする。
 * ヘッダーの高さはレスポンシブ対応で画面幅により変わるため、リサイズ時にも呼び直す。
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
 * - 新しい順(desc)で読み進めている場合、次は「話数 - 1」(下へ読み進む)
 * - 古い順(asc)で読み進めている場合、次は「話数 + 1」(上へ読み進む)
 *
 * @returns 次に読むべき話数。lastReadNum が未設定の場合は null
 */
export function getNextUnreadNum (): number | null {
  if (lastReadNum === null) return null
  return sortOrder === 'desc' ? lastReadNum - 1 : lastReadNum + 1
}

/**
 * 「次に読むべき話数」の行までスクロールする(画面の真ん中に来るようにする)。
 * 次の話数が決まらない場合(lastReadNum が未設定、つまり一度も話を開いていない場合)は
 * 画面の一番上にスクロールする。
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
 *
 * 独自フォント(Shippori Mincho / Zen Kaku Gothic New)の読み込みが完了する前に
 * スクロールすると、フォールバックフォントで計算した位置に一旦スクロールしたあと
 * フォント切り替えで行の高さがわずかに変わり、「次の話し」ボタンを押した時
 * (フォント読み込み済みの状態)と微妙に結果がズレることがある。
 * document.fonts.ready はフォントの読み込み自体の完了は保証するが、その後の
 * フォント切り替えに伴うレイアウト再計算(リフロー)が実際に反映されるのは
 * 次の描画フレーム以降になることがあるため、rAFを2回挟んで描画が完全に
 * 落ち着いてから(直前のフレームの計算結果が確定してから)ヘッダー高さの
 * 再計算・スクロールを行う。
 *
 * さらに、iOS Safariなどではページ読み込み直後はアドレスバーが展開された状態で
 * 表示領域(window.innerHeight)が一時的に小さく、その後の操作でアドレスバーが
 * 縮んで表示領域が広がることがある。この変化が起きた場合、初期表示時の
 * 中央寄せ位置と後からの操作時の位置がズレて見えることがあるため、
 * visualViewportのサイズ変化を短時間だけ監視し、変化があればその都度
 * スクロール位置を計算し直す。
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
