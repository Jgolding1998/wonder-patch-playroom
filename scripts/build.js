const fs = require('node:fs')
const path = require('node:path')
const { root, publicFiles } = require('./files.js')

const destination = path.resolve(root, 'dist')
if (path.relative(root, destination) !== 'dist') throw new Error('Unexpected build directory.')
if (fs.existsSync(destination) && fs.lstatSync(destination).isSymbolicLink()) throw new Error('Build directory cannot be a symlink.')
const files = publicFiles()
for (const file of files) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing source file: ${file}`)
}
fs.rmSync(destination, { recursive: true, force: true })
for (const file of files) {
  const output = path.join(destination, file)
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.copyFileSync(path.join(root, file), output)
}
console.log(`Built ${files.length} local files in dist/. No network or bundler needed.`)
