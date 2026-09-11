/**
 * scroll.ts
 */

import { lastReadNum, sortOrder } from './storage.js'

const headerEl = document.querySelector('header') as HTMLElement
const mainEl = document.getElementById('main') as HTMLElement

let hasScrolledToLastRead = false

export function updateHeaderHeightVar (): void {
  document.documentElement.style.setProperty('--header-h', String(headerEl.offsetHeight) + 'px')
}

export function scrollToEpisode (num: number, behavior: ScrollBehavior): void {
  const target = mainEl.querySelector('[data-num="' + String(num) + '"]')
  if (target === null) return

  target.scrollIntoView({ behavior, block: 'center' })
}

export function getNextUnreadNum (): number | null {
  if (lastReadNum === null) return null
  return sortOrder === 'desc' ? lastReadNum - 1 : lastReadNum + 1
}

export function scrollToNextUnreadEpisode (behavior: ScrollBehavior): void {
  const nextNum = getNextUnreadNum()
  if (nextNum === null) {
    window.scrollTo({ top: 0, behavior })
    return
  }
  scrollToEpisode(nextNum, behavior)
}

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
