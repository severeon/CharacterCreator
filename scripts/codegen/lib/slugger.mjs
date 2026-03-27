// scripts/codegen/lib/slugger.mjs

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[(),']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function catSlug(cat) {
  return slugify(cat)
}
