export type CatalogSummary = {
  id: string
  name: string
  shortDescription: string
  categories: string[]
  platforms: string[]
  license: string
  developmentStatus: string
  softwareType: string
  url: string
  landingURL: string
  releaseDate: string
}

export type CatalogDetail = CatalogSummary & {
  longDescription: string
  softwareVersion: string
  languages: string[]
  sourceFile: string
  raw: Record<string, unknown>
}

export type CatalogResponse = {
  page: number
  pageSize: number
  total: number
  items: CatalogSummary[]
}

export type FilterOptions = {
  categories: string[]
  platforms: string[]
  licenses: string[]
  developmentStatuses: string[]
  softwareTypes: string[]
  languages: string[]
}

export type ActiveFilters = {
  categories: string[]
  platforms: string[]
  licenses: string[]
  statuses: string[]
  types: string[]
  languages: string[]
}

export type SortOption = 'name' | 'releaseDate'
export type SortOrder = 'asc' | 'desc'

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'
export const SITE_TITLE = import.meta.env.VITE_SITE_TITLE ?? 'Public Catalog'

export const emptyFilters: FilterOptions = {
  categories: [],
  platforms: [],
  licenses: [],
  developmentStatuses: [],
  softwareTypes: [],
  languages: [],
}

export const initialActiveFilters: ActiveFilters = {
  categories: [],
  platforms: [],
  licenses: [],
  statuses: [],
  types: [],
  languages: [],
}

export const parseListParam = (value: string | null) =>
  value ? value.split(',').map((entry) => entry.trim()).filter(Boolean) : []

export const parseNumberParam = (
  value: string | null,
  fallback: number,
  min = 1,
  max = Number.MAX_SAFE_INTEGER
) => {
  if (!value) return fallback
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

export const resolveSortParam = (value: string | null): SortOption =>
  value === 'releaseDate' ? 'releaseDate' : 'name'

export const resolveOrderParam = (value: string | null): SortOrder =>
  value === 'desc' ? 'desc' : 'asc'

export const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return (await response.json()) as T
}

export const toQueryParam = (values: string[]) => values.join(',')

export const resolveLink = (item: CatalogSummary) =>
  item.landingURL || item.url

export const formatDate = (value: string) => {
  if (!value) return ''
  return new Date(value).toLocaleDateString()
}

export const pluralize = (count: number, label: string) =>
  count === 1 ? `${count} ${label}` : `${count} ${label}s`
