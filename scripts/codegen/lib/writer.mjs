// scripts/codegen/lib/writer.mjs
// Writes .mdx files with YAML frontmatter + MDX body

import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
const yaml = {
  dump(obj) {
    return simpleYaml(obj, 0)
  }
}

function simpleYaml(obj, indent) {
  const pad = '  '.repeat(indent)
  let out = ''
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) {
        out += `${pad}-\n${simpleYaml(item, indent + 1)}`
      } else {
        out += `${pad}- ${yamlValue(item)}\n`
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue
      if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0) {
        out += `${pad}${key}:\n${simpleYaml(value, indent + 1)}`
      } else if (Array.isArray(value) && value.length > 0) {
        out += `${pad}${key}:\n${simpleYaml(value, indent + 1)}`
      } else if (Array.isArray(value) && value.length === 0) {
        continue
      } else {
        out += `${pad}${key}: ${yamlValue(value)}\n`
      }
    }
  }
  return out
}

function yamlValue(v) {
  if (typeof v === 'string') {
    if (v.includes(':') || v.includes('#') || v.includes("'") || v.includes('"') || v.includes('\n')) {
      return JSON.stringify(v)
    }
    return v
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  if (Array.isArray(v)) return `[${v.map(yamlValue).join(', ')}]`
  return String(v)
}

export function toYaml(obj) {
  return yaml.dump ? yaml.dump(obj, { lineWidth: -1, quotingType: '"' }) : simpleYaml(obj, 0)
}

export function writeMdx(dir, slug, frontmatter, body = '') {
  mkdirSync(dir, { recursive: true })
  const yamlStr = toYaml(frontmatter)
  const content = `---\n${yamlStr}---\n${body ? '\n' + body + '\n' : ''}`
  writeFileSync(join(dir, `${slug}.mdx`), content, 'utf8')
}
