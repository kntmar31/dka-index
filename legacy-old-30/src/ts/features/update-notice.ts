/**
 * update-notice.ts
 *
 * 「最新話が更新されました」の通知を画面中央にオーバーレイ表示する。
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
