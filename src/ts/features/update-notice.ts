/**
 * update-notice.ts
 *
 * 「最新話が更新されました」の通知を画面中央にオーバーレイ表示する。
 */

/**
 * 「最新話が更新されました」の通知を画面中央にオーバーレイ表示する。
 * main の中身を差し替えるのではなく、話数一覧の上に浮かせる形にすることで、
 * 通知が出ている間も背後に一覧が見えるようにする。
 * 見た目は読み込み中・エラー時のカード(state-card)をそのまま使い、
 * 「NEW」バッジを添える。フェード+スライドインで現れ、
 * 一定時間後にその場でフェードアウトして消える。
 */
export function showUpdateAnnouncement (): void {
  const ANNOUNCEMENT_DURATION_MS = 1200
  const ANNOUNCEMENT_TRANSITION_MS = 250

  const overlay = document.createElement('div')
  overlay.className = 'update-overlay'
  overlay.innerHTML =
    '<div class="state-card">' +
    '<span class="update-badge">NEW</span>' +
    '<p class="state-text">最新話が更新されました</p>' +
    '</div>'
  document.body.appendChild(overlay)

  const card = overlay.querySelector('.state-card')
  if (card === null) return

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      card.classList.add('is-visible')
    })
  })

  window.setTimeout(() => {
    card.classList.remove('is-visible')
    card.classList.add('is-leaving')
    window.setTimeout(() => {
      overlay.remove()
    }, ANNOUNCEMENT_TRANSITION_MS)
  }, ANNOUNCEMENT_DURATION_MS)
}
