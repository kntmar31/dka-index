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
  const gasUrl = process.env.GAS_API_URL
  const gasJsPath = path.join(DIST_JS_DIR, 'features', 'apis', 'gas.js')

  if (!fs.existsSync(gasJsPath)) {
    console.error('ERROR: ' + gasJsPath + ' が見つかりません。tscのビルドに失敗している可能性があります。')
    process.exit(1)
  }

  let gasJs = fs.readFileSync(gasJsPath, 'utf8')
  const placeholder = '__GAS_API_URL__'

  if (!gasJs.includes(placeholder)) {
    console.error('ERROR: placeholder "' + placeholder + '" が ' + gasJsPath + ' 内に見つかりません。')
    process.exit(1)
  }

  if (gasUrl === undefined || gasUrl === '') {
    console.warn(
      'WARNING: 環境変数 GAS_API_URL が設定されていないため、プレースホルダーを置換せずビルドを続行します。' +
        '(ローカルでの見た目確認用途を想定。本番デプロイ時はCI側でGAS_API_URLシークレットを設定してください。)'
    )
  } else {
    gasJs = gasJs.split(placeholder).join(gasUrl)
    fs.writeFileSync(gasJsPath, gasJs, 'utf8')
    console.log('Injected GAS_API_URL into ' + gasJsPath)
  }

  console.log('Build complete: ' + DIST_DIR)
}

main()
