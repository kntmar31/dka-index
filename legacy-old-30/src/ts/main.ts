/**
 * main.ts
 *
 * 「堀さんと宮村くん 全話リスト」アプリのエントリーポイント。
 * 各機能(features/以下)を組み合わせ、初期化処理(init)とデータ取得後の
 * 一連の流れ(loadLiveData)だけをここで担う。個々の機能の実装は
 * features/ 以下の各ファイルを参照。
 */

import { fetchEpisodesAndCount } from './features/apis/gas.js'
import { initActionBar, showActionBar, updateSortActionLabel } from './features/action-bar.js'
import { handleListClick, render } from './features/render.js'
import { scrollToNextUnread, updateHeaderHeightVar } from './features/scroll.js'
import {
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

/**
 * Google Apps Script API から話数リストを取得する。
 * 成功すれば DATA にセットして一覧を表示し、失敗すればエラー状態を表示する。
 * あわせて、前回取得時より話数(count)が増えていないかを確認し、
 * 増えていれば画面中央へ更新通知をオーバーレイ表示する。
 */
async function loadLiveData (): Promise<void> {
  try {
    const { episodes, count } = await fetchEpisodesAndCount()

    setData(episodes)
    setLoadState('ready')

    // 前回取得時の話数と比較し、増えていれば更新通知を出す。
    // (初回訪問など、前回値が無い場合は通知しない。今回の値を新たな基準として保存する。)
    const hasNewEpisodes = lastKnownCount !== null && count > lastKnownCount
    setLastKnownCount(count)

    // 既読情報を新しい話数リストに合わせて整合させる。
    // 存在しない番号が既読セットに残っていれば取り除く。
    const validNums = new Set(episodes.map((ep) => ep.num))
    readSet.forEach((n) => {
      if (!validNums.has(n)) {
        readSet.delete(n)
      }
    })

    // 既読情報のクリーンアップ・話数カウントの更新をまとめて保存する。
    persistState()

    render(searchQuery)
    scrollToNextUnread()

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

/**
 * アプリの初期化処理。
 * イベントリスナーの登録、読み込み中表示、ライブデータの取得を行う。
 */
function init (): void {
  mainEl.addEventListener('click', handleListClick)
  initTheme()
  initActionBar()
  updateSortActionLabel()

  updateHeaderHeightVar()
  window.addEventListener('resize', updateHeaderHeightVar)

  render(searchQuery) // 読み込み中表示を出す

  void loadLiveData()
}

init()
