// jest.config.js
//
// ソース側は import ... from './foo.js' のように、実体は .ts でも
// 拡張子 .js を付けて書く(NodeのESM解決規則に合わせた慣習。ビルド後の
// dist/js/ 以下に実際に .js が生成されることを見越した書き方)。
// tsconfig.jest.json 側では Node16 のモジュール解決によりこれを .ts として
// 型チェックできるが、ts-jest が出力するCommonJSコード内の require('./foo.js')
// という文字列そのものは書き換えられないため、Jest自身のモジュール解決でも
// 対応させる必要がある。moduleNameMapper で相対パスの末尾 .js を取り除き、
// 実体の .ts ファイルを解決できるようにしている。
module.exports = {
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }]
  },
  testMatch: ['**/src/ts/**/*.test.ts']
}
