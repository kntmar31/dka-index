/**
 * main.ts
 *
 * 「堀さんと宮村くん 全話リスト」アプリのエントリーポイント。
 */

import { fetchEpisodesAndCount } from './features/apis/gas.js'
import { initActionBar, showActionBar, updateSortActionLabel } from './features/action-bar.js'
import { handleListClick, render } from './features/render.js'
import { scrollToEpisode, scrollToNextUnread, updateHeaderHeightVar } from './features/scroll.js'
import { initSettings } from './features/settings.js'
import {
  jumpToLatestOnUpdate,
  lastKnownCount,
  persistState,
  readSet,
  searchQuery,
  setData,
  setLastKnownCount,
  setLoadErrorMessage,
  setLoadState
} from './features/storage.js'
import { initTheme } from './features/theme.js'
import { showUpdateAnnouncement } from './features/update-notice.js'

const mainEl = document.getElementById('main') as HTMLElement

async function loadLiveData (): Promise<void> {
  try {
    const { episodes, count } = await fetchEpisodesAndCount()

    setData(episodes)
    setLoadState('ready')

    const hasNewEpisodes = lastKnownCount !== null && count > lastKnownCount
    setLastKnownCount(count)

    const validNums = new Set(episodes.map((ep) => ep.num))
    readSet.forEach((n) => {
      if (!validNums.has(n)) {
        readSet.delete(n)
      }
    })

    persistState()

    render(searchQuery)

    if (hasNewEpisodes && jumpToLatestOnUpdate) {
      const latestNum = Math.max(...episodes.map((ep) => ep.num))
      scrollToEpisode(latestNum, 'smooth')
    } else {
      scrollToNextUnread()
    }

    if (hasNewEpisodes) {
      showUpdateAnnouncement()
    }

    showActionBar()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    setLoadState('error')
    setLoadErrorMessage(message)
    render(searchQuery)
  }
}

function init (): void {
  mainEl.addEventListener('click', handleListClick)
  initTheme()
  initSettings()
  initActionBar()
  updateSortActionLabel()

  updateHeaderHeightVar()
  window.addEventListener('resize', updateHeaderHeightVar)

  render(searchQuery)

  void loadLiveData()
}

init()
