import { useEffect, useMemo, useState } from 'react'
import './App.css'

type CatalogSummary = {
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

type CatalogDetail = CatalogSummary & {
  longDescription: string
  softwareVersion: string
  languages: string[]
  sourceFile: string
  raw: Record<string, unknown>
}

type CatalogResponse = {
  page: number
  pageSize: number
  total: number
  items: CatalogSummary[]
}

type FilterOptions = {
  categories: string[]
  platforms: string[]
  licenses: string[]
  developmentStatuses: string[]
  softwareTypes: string[]
  languages: string[]
}

type ActiveFilters = {
  categories: string[]
  platforms: string[]
  licenses: string[]
  statuses: string[]
  types: string[]
  languages: string[]
}

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'
const SITE_TITLE = import.meta.env.VITE_SITE_TITLE ?? 'Public Catalog'

const emptyFilters: FilterOptions = {
  categories: [],
  platforms: [],
  licenses: [],
  developmentStatuses: [],
  softwareTypes: [],
  languages: [],
}

const initialActiveFilters: ActiveFilters = {
  categories: [],
  platforms: [],
  licenses: [],
  statuses: [],
  types: [],
  languages: [],
}

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }
  return (await response.json()) as T
}

const toQueryParam = (values: string[]) => values.join(',')

const resolveLink = (item: CatalogSummary) => item.landingURL || item.url

const formatDate = (value: string) => {
  if (!value) return ''
  return new Date(value).toLocaleDateString()
}

const pluralize = (count: number, label: string) =>
  count === 1 ? `${count} ${label}` : `${count} ${label}s`

function App() {
  const [filters, setFilters] = useState<FilterOptions>(emptyFilters)
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(
    initialActiveFilters
  )
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(24)
  const [catalog, setCatalog] = useState<CatalogResponse>({
    page: 1,
    pageSize: 24,
    total: 0,
    items: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<CatalogDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('q', search.trim())
    if (activeFilters.categories.length)
      params.set('category', toQueryParam(activeFilters.categories))
    if (activeFilters.platforms.length)
      params.set('platform', toQueryParam(activeFilters.platforms))
    if (activeFilters.licenses.length)
      params.set('license', toQueryParam(activeFilters.licenses))
    if (activeFilters.statuses.length)
      params.set('status', toQueryParam(activeFilters.statuses))
    if (activeFilters.types.length)
      params.set('type', toQueryParam(activeFilters.types))
    if (activeFilters.languages.length)
      params.set('language', toQueryParam(activeFilters.languages))
    params.set('page', String(page))
    params.set('page_size', String(pageSize))
    return params.toString()
  }, [activeFilters, page, pageSize, search])

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const data = await fetchJson<FilterOptions>(
          `${API_BASE}/catalog/filters`
        )
        setFilters(data)
      } catch (err) {
        console.error(err)
      }
    }
    loadFilters()
  }, [])

  useEffect(() => {
    const loadCatalog = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchJson<CatalogResponse>(
          `${API_BASE}/catalog?${queryString}`
        )
        setCatalog(data)
      } catch (err) {
        setError('カタログの取得に失敗しました。APIの稼働を確認してください。')
      } finally {
        setLoading(false)
      }
    }
    loadCatalog()
  }, [queryString])

  useEffect(() => {
    if (!selectedId) {
      setSelectedItem(null)
      return
    }
    const loadDetail = async () => {
      setDetailLoading(true)
      try {
        const data = await fetchJson<CatalogDetail>(
          `${API_BASE}/catalog/${selectedId}`
        )
        setSelectedItem(data)
      } catch (err) {
        setSelectedItem(null)
      } finally {
        setDetailLoading(false)
      }
    }
    loadDetail()
  }, [selectedId])

  useEffect(() => {
    setPage(1)
  }, [search, activeFilters])

  const totalPages = Math.max(1, Math.ceil(catalog.total / catalog.pageSize))

  const handleMultiSelect = (
    event: React.ChangeEvent<HTMLSelectElement>,
    key: keyof ActiveFilters
  ) => {
    const selected = Array.from(event.target.selectedOptions).map(
      (option) => option.value
    )
    setActiveFilters((prev) => ({ ...prev, [key]: selected }))
  }

  const resetFilters = () => {
    setActiveFilters(initialActiveFilters)
    setSearch('')
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Open catalog for public data tools</p>
          <h1>{SITE_TITLE}</h1>
          <p className="subtitle">
            YAMLカタログを統合し、検索・比較・発見を行うための一覧です。
          </p>
        </div>
        <div className="api-chip">
          API: <span>{API_BASE}</span>
        </div>
      </header>

      <section className="controls">
        <div className="search">
          <label htmlFor="search">キーワード検索</label>
          <input
            id="search"
            type="search"
            placeholder="name / description / URL など"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="filters">
          <div className="filter-group">
            <label htmlFor="category">カテゴリ</label>
            <select
              id="category"
              multiple
              value={activeFilters.categories}
              onChange={(event) => handleMultiSelect(event, 'categories')}
            >
              {filters.categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="platform">プラットフォーム</label>
            <select
              id="platform"
              multiple
              value={activeFilters.platforms}
              onChange={(event) => handleMultiSelect(event, 'platforms')}
            >
              {filters.platforms.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="license">ライセンス</label>
            <select
              id="license"
              multiple
              value={activeFilters.licenses}
              onChange={(event) => handleMultiSelect(event, 'licenses')}
            >
              {filters.licenses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="status">開発ステータス</label>
            <select
              id="status"
              multiple
              value={activeFilters.statuses}
              onChange={(event) => handleMultiSelect(event, 'statuses')}
            >
              {filters.developmentStatuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="type">タイプ</label>
            <select
              id="type"
              multiple
              value={activeFilters.types}
              onChange={(event) => handleMultiSelect(event, 'types')}
            >
              {filters.softwareTypes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="language">言語</label>
            <select
              id="language"
              multiple
              value={activeFilters.languages}
              onChange={(event) => handleMultiSelect(event, 'languages')}
            >
              {filters.languages.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-actions">
          <div className="page-size">
            <label htmlFor="pageSize">表示件数</label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
            >
              {[12, 24, 48].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="secondary" onClick={resetFilters}>
            条件をリセット
          </button>
        </div>
      </section>

      <section className="results">
        <div className="results-header">
          <div>
            <h2>Catalog</h2>
            <p>
              {pluralize(catalog.total, 'item')} を表示中 ({catalog.page}/
              {totalPages})
            </p>
          </div>
          <div className="pagination">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              前へ
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              次へ
            </button>
          </div>
        </div>

        {loading && <p className="status">読み込み中...</p>}
        {error && <p className="status error">{error}</p>}
        {!loading && !error && catalog.items.length === 0 && (
          <p className="status">該当するカタログがありません。</p>
        )}

        <div className="grid">
          {catalog.items.map((item) => (
            <article key={item.id} className="card">
              <header>
                <h3>{item.name || item.id}</h3>
                <p className="description">{item.shortDescription}</p>
              </header>
              <div className="meta">
                {item.categories.map((value) => (
                  <span key={value} className="chip">
                    {value}
                  </span>
                ))}
              </div>
              <div className="meta">
                {item.platforms.map((value) => (
                  <span key={value} className="chip subtle">
                    {value}
                  </span>
                ))}
              </div>
              <div className="info">
                {item.license && <span>License: {item.license}</span>}
                {item.developmentStatus && (
                  <span>Status: {item.developmentStatus}</span>
                )}
                {item.releaseDate && (
                  <span>Release: {formatDate(item.releaseDate)}</span>
                )}
              </div>
              <div className="card-actions">
                {resolveLink(item) && (
                  <a
                    href={resolveLink(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="link"
                  >
                    Visit
                  </a>
                )}
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setSelectedId((prev) => (prev === item.id ? null : item.id))
                  }
                >
                  {selectedId === item.id ? '閉じる' : '詳細'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="detail">
        <div className="detail-header">
          <h2>Detail</h2>
          {selectedId && (
            <button
              type="button"
              className="secondary"
              onClick={() => setSelectedId(null)}
            >
              閉じる
            </button>
          )}
        </div>
        {!selectedId && (
          <p className="status">カードの詳細ボタンで情報を表示します。</p>
        )}
        {detailLoading && <p className="status">詳細を取得中...</p>}
        {selectedItem && !detailLoading && (
          <div className="detail-body">
            <h3>{selectedItem.name || selectedItem.id}</h3>
            <p>{selectedItem.longDescription || selectedItem.shortDescription}</p>
            <div className="detail-list">
              {selectedItem.languages.length > 0 && (
                <div>
                  <strong>Languages:</strong>{' '}
                  {selectedItem.languages.join(', ')}
                </div>
              )}
              {selectedItem.softwareVersion && (
                <div>
                  <strong>Version:</strong> {selectedItem.softwareVersion}
                </div>
              )}
              {selectedItem.sourceFile && (
                <div>
                  <strong>Source:</strong> {selectedItem.sourceFile}
                </div>
              )}
            </div>
            <div className="detail-actions">
              {selectedItem.landingURL && (
                <a
                  href={selectedItem.landingURL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Landing URL
                </a>
              )}
              {selectedItem.url && (
                <a href={selectedItem.url} target="_blank" rel="noreferrer">
                  Repository
                </a>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

export default App
