export type Value =
  | null
  | boolean
  | number
  | string
  | Value[]
  | { [key: string]: Value }

export interface Entity {
  id: string
  entity_type: string
  properties: Record<string, Value>
  tags: string[]
  mdx_body: string
  source_pack: string
}

export interface EntitySummary {
  id: string
  entity_type: string
  name: string
  tags: string[]
}
