/**
 * Vite dev plugin: serves entity content from content/packs/ over HTTP.
 * Enables the frontend to run at localhost:5173 without the Tauri backend.
 *
 * Endpoints (all under /_entities/):
 *   GET /_entities/by-type/:type      → EntitySummary[]
 *   GET /_entities/by-id/:id          → Entity | null
 *   GET /_entities/search?q=:query    → EntitySummary[]
 */

import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import type { Plugin } from 'vite'

interface FrontMatter {
  id: string
  entity_type: string
  properties: Record<string, unknown>
  tags?: string[]
}

interface Entity {
  id: string
  entity_type: string
  properties: Record<string, unknown>
  tags: string[]
  mdx_body: string
  source_pack: string
}

interface EntitySummary {
  id: string
  entity_type: string
  name: string
  tags: string[]
}

function parseMdx(filePath: string, sourcePack: string): Entity | null {
  const raw = fs.readFileSync(filePath, 'utf-8')
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return null

  let fm: FrontMatter
  try {
    fm = yaml.load(match[1]) as FrontMatter
  } catch {
    return null
  }

  if (!fm?.id || !fm?.entity_type) return null

  // Deduplicate tags — MDX files sometimes have repeated tag entries
  const tags = [...new Set(fm.tags ?? [])]

  return {
    id: fm.id,
    entity_type: fm.entity_type,
    properties: fm.properties ?? {},
    tags,
    mdx_body: match[2].trim(),
    source_pack: sourcePack,
  }
}

function toSummary(entity: Entity): EntitySummary {
  const name =
    (entity.properties.name as string | undefined) ??
    entity.id.split(':').pop() ??
    entity.id
  return { id: entity.id, entity_type: entity.entity_type, name, tags: entity.tags }
}

function loadPack(packDir: string, packId: string): Entity[] {
  const entities: Entity[] = []
  const entitiesDir = path.join(packDir, 'entities')
  if (!fs.existsSync(entitiesDir)) return entities

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
        const entity = parseMdx(full, packId)
        if (entity) entities.push(entity)
      }
    }
  }

  walk(entitiesDir)
  return entities
}

function buildIndex(contentDir: string): Entity[] {
  const seen = new Map<string, Entity>()
  const packsDir = path.join(contentDir, 'packs')
  if (!fs.existsSync(packsDir)) return []

  for (const entry of fs.readdirSync(packsDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      for (const entity of loadPack(path.join(packsDir, entry.name), entry.name)) {
        // First file wins — skip duplicates (e.g. classes/ vs classes/paragon/)
        if (!seen.has(entity.id)) seen.set(entity.id, entity)
      }
    }
  }

  return [...seen.values()]
}

export function contentBrowserPlugin(): Plugin {
  let entities: Entity[] = []

  return {
    name: 'content-browser',
    configureServer(server) {
      const contentDir = path.resolve(process.cwd(), 'content')
      entities = buildIndex(contentDir)
      console.log(`[content-browser] loaded ${entities.length} entities`)

      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', `http://localhost`)

        if (!url.pathname.startsWith('/_entities/')) {
          return next()
        }

        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')

        const sub = url.pathname.slice('/_entities/'.length)

        if (sub.startsWith('by-type-full/')) {
          const type = decodeURIComponent(sub.slice('by-type-full/'.length))
          const results = entities.filter((e) => e.entity_type === type)
          res.end(JSON.stringify(results))
          return
        }

        if (sub.startsWith('by-type/')) {
          const type = decodeURIComponent(sub.slice('by-type/'.length))
          const results = entities
            .filter((e) => e.entity_type === type)
            .map(toSummary)
          res.end(JSON.stringify(results))
          return
        }

        if (sub.startsWith('by-id/')) {
          const id = decodeURIComponent(sub.slice('by-id/'.length))
          const entity = entities.find((e) => e.id === id) ?? null
          res.end(JSON.stringify(entity))
          return
        }

        if (sub === 'search') {
          const q = (url.searchParams.get('q') ?? '').toLowerCase()
          const results = entities
            .filter(
              (e) =>
                e.id.toLowerCase().includes(q) ||
                String(e.properties.name ?? '').toLowerCase().includes(q) ||
                e.tags.some((t) => t.toLowerCase().includes(q))
            )
            .map(toSummary)
          res.end(JSON.stringify(results))
          return
        }

        res.statusCode = 404
        res.end(JSON.stringify(null))
      })
    },
  }
}
