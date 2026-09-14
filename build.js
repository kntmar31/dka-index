// build.js
//
// ビルド手順:
//   1. TypeScript(src/ts) を dist/js にコンパイル
//   2. SCSS(src/scss) を dist/css にコンパイル
//   3. src/index.html を dist/index.html にコピー
//   4. dist/js/features/apis/gas.js 内のプレースホルダー(__GAS_API_URL__)を
//      環境変数 GAS_API_URL の値で置換する
//      (GAS通信ロジックは features/apis/gas.ts に切り出されているため、
//      main.js ではなくこちらが置換対象になる)
//
// 実行: node build.js
// (事前に `npm install` で devDependencies を入れておくこと)

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = __dirname
const DIST_DIR = path.join(ROOT, 'dist')
const DIST_JS_DIR = path.join(DIST_DIR, 'js')
const DIST_CSS_DIR = path.join(DIST_DIR, 'css')

function run (cmd) {
  console.log('> ' + cmd)
  execSync(cmd, { stdio: 'inherit', cwd: ROOT })
}

function ensureDir (dir) {
  fs.mkdirSync(dir, { recursive: true })
}

/**
 * 指定したJSファイル内の __GAS_API_URL__ プレースホルダーを、
 * 環境変数 GAS_API_URL の値で置換する。
 *
 * @param {string} jsPath 置換対象のJSファイルの絶対パス
 */
function injectGasApiUrl (jsPath) {
  const gasUrl = process.env.GAS_API_URL

  if (!fs.existsSync(jsPath)) {
    console.error('ERROR: ' + jsPath + ' が見つかりません。tscのビルドに失敗している可能性があります。')
    process.exit(1)
  }

  let js = fs.readFileSync(jsPath, 'utf8')
  const placeholder = '__GAS_API_URL__'

  if (!js.includes(placeholder)) {
    console.error('ERROR: placeholder "' + placeholder + '" が ' + jsPath + ' 内に見つかりません。')
    process.exit(1)
  }

  if (gasUrl === undefined || gasUrl === '') {
    console.warn(
      'WARNING: 環境変数 GAS_API_URL が設定されていないため、プレースホルダーを置換せずビルドを続行します。' +
        '(ローカルでの見た目確認用途を想定。本番デプロイ時はCI側でGAS_API_URLシークレットを設定してください。)'
    )
  } else {
    js = js.split(placeholder).join(gasUrl)
    fs.writeFileSync(jsPath, js, 'utf8')
    console.log('Injected GAS_API_URL into ' + jsPath)
  }
}

function main () {
  ensureDir(DIST_JS_DIR)
  ensureDir(DIST_CSS_DIR)

  // 1. TypeScript -> dist/js
  run('npx tsc')

  // 2. SCSS -> dist/css
  run('npx sass src/scss/styles.scss:dist/css/styles.css --no-source-map')

  // 3. index.html をそのままコピー(パスは最初から dist 構成基準で書かれている)
  const srcHtmlPath = path.join(ROOT, 'src', 'index.html')
  const distHtmlPath = path.join(DIST_DIR, 'index.html')
  fs.copyFileSync(srcHtmlPath, distHtmlPath)
  console.log('Copied index.html -> ' + distHtmlPath)

  // 4. GAS_API_URL プレースホルダーの置換
  injectGasApiUrl(path.join(DIST_JS_DIR, 'features', 'apis', 'gas.js'))

  console.log('Build complete: ' + DIST_DIR)
}

main()
