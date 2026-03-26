// webapp/src/lib/content-pack-loader.js
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import matter from 'gray-matter'

const VALID_TYPES = new Set(['race', 'class', 'feat', 'spell', 'power', 'invocation', 'campaign'])

/**
 * Recursively collect all .md file paths under a directory.
 * @param {string} dir
 * @returns {string[]}
 */
function collectMdFiles(dir) {
  const results = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      results.push(...collectMdFiles(fullPath))
    } else if (extname(entry) === '.md') {
      results.push(fullPath)
    }
  }
  return results
}

/**
 * Parse a single .md file into a typed entity object.
 * @param {string} filePath
 * @returns {object}
 */
function parseEntityFile(filePath) {
  const raw = readFileSync(filePath, 'utf8')
  const { data } = matter(raw)

  if (!data.type || !VALID_TYPES.has(data.type)) {
    throw new Error(`Unknown type "${data.type}" in ${filePath}. Expected one of: ${[...VALID_TYPES].join(', ')}`)
  }

  return data
}

/**
 * Load all content pack entities from a directory tree.
 * @param {string} dir - Root directory containing races/, classes/, feats/, etc.
 * @returns {Promise<import('./content-pack-types.js').ContentPack>}
 */
export async function loadContentPacks(dir) {
  const files = collectMdFiles(dir)

  /** @type {import('./content-pack-types.js').ContentPack} */
  const pack = {
    races: [],
    classes: [],
    feats: [],
    spells: [],
    powers: [],
    invocations: [],
    campaigns: [],
  }

  for (const filePath of files) {
    const entity = parseEntityFile(filePath)
    switch (entity.type) {
      case 'race':       pack.races.push(entity);       break
      case 'class':      pack.classes.push(entity);     break
      case 'feat':       pack.feats.push(entity);       break
      case 'spell':      pack.spells.push(entity);      break
      case 'power':      pack.powers.push(entity);      break
      case 'invocation': pack.invocations.push(entity); break
      case 'campaign':   pack.campaigns.push(entity);   break
    }
  }

  return pack
}
