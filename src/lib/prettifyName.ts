/** Convert a raw entity ID or slug to a readable title-cased name. */
export function prettifyName(raw: string): string {
  const slug = raw.includes(':') ? (raw.split(':').pop() ?? raw) : raw
  if (slug === slug.toLowerCase()) {
    return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
  return slug
}
