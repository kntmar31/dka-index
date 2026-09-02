/**
 * data.ts
 *
 * 話数データの型定義。
 * 以前はここに613話分のフォールバックデータ(FALLBACK_DATA)を持っていたが、
 * ソートのデフォルトを「新しい順」に変更したことに伴い、
 * 初期表示にフォールバックデータを使うのをやめた(Issue #9)。
 * 現在は Google Apps Script API から取得したデータのみを表示する。
 */

/** 1話分のデータ */
export interface Episode {
  /** 話数(1始まり) */
  num: number
  /** 話のタイトル */
  title: string
  /** 原作ページ(dka-hero.me)への絶対URL */
  url: string
}
