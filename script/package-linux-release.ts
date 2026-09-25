import { createHash } from 'crypto'
import { createReadStream } from 'fs'
import { writeFile } from 'fs/promises'
import { basename, join } from 'path'

import { packageAppImage } from './package-appimage'
import { packageDebian } from './package-debian'
import { getDistRoot } from './dist-info'

function getSha256Checksum(fullPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(fullPath)

    stream.on('data', chunk => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

async function writeChecksums(files: ReadonlyArray<string>) {
  let contents = ''

  for (const file of files) {
    const checksum = await getSha256Checksum(file)
    contents += `${checksum}  ${basename(file)}\n`
  }

  const checksumFile = join(getDistRoot(), 'SHA256SUMS')
  await writeFile(checksumFile, contents)

  return checksumFile
}

async function main() {
  if (process.platform !== 'linux') {
    throw new Error('ENSTA Linux release packaging must run on Linux')
  }

  const debianPackage = await packageDebian()
  const appImagePackage = await packageAppImage()
  const checksumFile = await writeChecksums([debianPackage, appImagePackage])

  console.log('ENSTA Linux release artifacts:')
  console.log(` - ${debianPackage}`)
  console.log(` - ${appImagePackage}`)
  console.log(` - ${checksumFile}`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
