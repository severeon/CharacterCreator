import { slugify } from './slugger.mjs'

export function toArcanumFm(entityType, name, fields, tags) {
  const slug = slugify(name)
  return {
    id: `srd:${entityType}:${slug}`,
    entity_type: entityType,
    properties: { name, ...fields },
    tags,
  }
}
