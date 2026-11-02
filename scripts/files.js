const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const entryFiles = ['index.html', 'styles.css', 'src/learning.js', 'src/progress.js', 'src/app.js']

function publicFiles() {
  const files = [...entryFiles]
  const assets = path.join(root, 'assets')
  if (fs.existsSync(assets)) {
    for (const item of fs.readdirSync(assets, { withFileTypes: true })) {
      if (item.isFile() && /^[a-z0-9-]+\.svg$/.test(item.name)) files.push(`assets/${item.name}`)
    }
  }
  return files
}

module.exports = { root, publicFiles }
