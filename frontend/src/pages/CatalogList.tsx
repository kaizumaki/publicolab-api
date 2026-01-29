import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  API_BASE,
  SITE_TITLE,
  emptyFilters,
  fetchJson,
  formatDate,
  initialActiveFilters,
  parseListParam,
  parseNumberParam,
  pluralize,
  resolveOrderParam,
  resolveSortParam,
  resolveLink,
  toQueryParam,
} from '../lib/catalog'
import type {
  ActiveFilters,
  CatalogResponse,
  FilterOptions,
  SortOption,
  SortOrder,
} from '../lib/catalog'

function CatalogListPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const initialParams = new URLSearchParams(location.search)
  const initialFilters: ActiveFilters = {
    categories: parseListParam(initialParams.get('category')),
    platforms: parseListParam(initialParams.get('platform')),
    licenses: parseListParam(initialParams.get('license')),
    statuses: parseListParam(initialParams.get('status')),
    types: parseListParam(initialParams.get('type')),
    languages: parseListParam(initialParams.get('language')),
  }

  const [filters, setFilters] = useState<FilterOptions>(emptyFilters)
  const [activeFilters, setActiveFilters] =
    useState<ActiveFilters>(initialFilters)
  const [search, setSearch] = useState(initialParams.get('q') ?? '')
  const [page, setPage] = useState(
    parseNumberParam(initialParams.get('page'), 1)
  )
  const [pageSize, setPageSize] = useState(
    parseNumberParam(initialParams.get('page_size'), 24, 1, 48)
  )
  const [sort, setSort] = useState<SortOption>(
    resolveSortParam(initialParams.get('sort'))
  )
  const [order, setOrder] = useState<SortOrder>(
    resolveOrderParam(initialParams.get('order'))
  )
  const [catalog, setCatalog] = useState<CatalogResponse>({
    page: 1,
    pageSize: 24,
    total: 0,
    items: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const didInitPageReset = useRef(false)

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
    params.set('sort', sort)
    params.set('order', order)
    return params.toString()
  }, [activeFilters, page, pageSize, search, sort, order])

  const filterQueryString = useMemo(() => {
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
    return params.toString()
  }, [activeFilters, search])

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const url = filterQueryString
          ? `${API_BASE}/catalog/filters?${filterQueryString}`
          : `${API_BASE}/catalog/filters`
        const data = await fetchJson<FilterOptions>(url)
        setFilters(data)
      } catch (err) {
        console.error(err)
      }
    }
    loadFilters()
  }, [filterQueryString])

  useEffect(() => {
    const nextSearch = `?${queryString}`
    if (location.search !== nextSearch) {
      navigate({ pathname: location.pathname, search: nextSearch }, { replace: true })
    }
  }, [location.pathname, location.search, navigate, queryString])

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
    if (!didInitPageReset.current) {
      didInitPageReset.current = true
      return
    }
    setPage(1)
  }, [search, activeFilters, sort, order])

  const totalPages = Math.max(1, Math.ceil(catalog.total / catalog.pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const toggleFilterValue = (key: keyof ActiveFilters, value: string) => {
    setActiveFilters((prev) => {
      const current = new Set(prev[key])
      if (current.has(value)) {
        current.delete(value)
      } else {
        current.add(value)
      }
      return { ...prev, [key]: Array.from(current) }
    })
  }

  const resetFilters = () => {
    setActiveFilters(initialActiveFilters)
    setSearch('')
    setSort('name')
    setOrder('asc')
    setPage(1)
  }

  const resetOnlyFilters = () => {
    setActiveFilters(initialActiveFilters)
    setPage(1)
  }

  const activeFilterChips = [
    ...activeFilters.categories.map((value) => ({
      key: `category-${value}`,
      label: value,
      onRemove: () => toggleFilterValue('categories', value),
    })),
    ...activeFilters.platforms.map((value) => ({
      key: `platform-${value}`,
      label: value,
      onRemove: () => toggleFilterValue('platforms', value),
    })),
    ...activeFilters.licenses.map((value) => ({
      key: `license-${value}`,
      label: value,
      onRemove: () => toggleFilterValue('licenses', value),
    })),
    ...activeFilters.statuses.map((value) => ({
      key: `status-${value}`,
      label: value,
      onRemove: () => toggleFilterValue('statuses', value),
    })),
    ...activeFilters.types.map((value) => ({
      key: `type-${value}`,
      label: value,
      onRemove: () => toggleFilterValue('types', value),
    })),
    ...activeFilters.languages.map((value) => ({
      key: `language-${value}`,
      label: value,
      onRemove: () => toggleFilterValue('languages', value),
    })),
  ]

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
        {activeFilterChips.length > 0 && (
          <div className="active-filters">
            <div className="active-filters-header">
              <span>選択中フィルター</span>
              <button
                type="button"
                className="secondary"
                onClick={resetOnlyFilters}
              >
                フィルターのみ解除
              </button>
            </div>
            <div className="active-filters-chips">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className="active-filter-chip"
                  onClick={chip.onRemove}
                >
                  {chip.label}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          </div>
        )}
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
            <div className="filter-label">カテゴリ</div>
            <div className="filter-options">
              {filters.categories.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`filter-chip ${
                    activeFilters.categories.includes(value) ? 'active' : ''
                  }`}
                  onClick={() => toggleFilterValue('categories', value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-label">プラットフォーム</div>
            <div className="filter-options">
              {filters.platforms.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`filter-chip ${
                    activeFilters.platforms.includes(value) ? 'active' : ''
                  }`}
                  onClick={() => toggleFilterValue('platforms', value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-label">ライセンス</div>
            <div className="filter-options">
              {filters.licenses.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`filter-chip ${
                    activeFilters.licenses.includes(value) ? 'active' : ''
                  }`}
                  onClick={() => toggleFilterValue('licenses', value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-label">開発ステータス</div>
            <div className="filter-options">
              {filters.developmentStatuses.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`filter-chip ${
                    activeFilters.statuses.includes(value) ? 'active' : ''
                  }`}
                  onClick={() => toggleFilterValue('statuses', value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-label">タイプ</div>
            <div className="filter-options">
              {filters.softwareTypes.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`filter-chip ${
                    activeFilters.types.includes(value) ? 'active' : ''
                  }`}
                  onClick={() => toggleFilterValue('types', value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-label">言語</div>
            <div className="filter-options">
              {filters.languages.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`filter-chip ${
                    activeFilters.languages.includes(value) ? 'active' : ''
                  }`}
                  onClick={() => toggleFilterValue('languages', value)}
                >
                  {value}
                </button>
              ))}
            </div>
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
          <div className="sort-control">
            <label htmlFor="sort">並び替え</label>
            <select
              id="sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
            >
              <option value="name">名前順</option>
              <option value="releaseDate">更新日順</option>
            </select>
          </div>
          <div className="sort-control">
            <label htmlFor="order">順序</label>
            <select
              id="order"
              value={order}
              onChange={(event) => setOrder(event.target.value as SortOrder)}
            >
              <option value="asc">昇順</option>
              <option value="desc">降順</option>
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
          <div className="empty-state">
            <h3>該当するカタログがありません</h3>
            <p>
              検索条件を広げるか、フィルタをリセットして再度お試しください。
            </p>
            <button type="button" onClick={resetFilters}>
              条件をリセット
            </button>
          </div>
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
                <Link
                  to={`/catalog/${item.id}`}
                  state={{ from: `?${queryString}` }}
                  className="secondary"
                >
                  詳細
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default CatalogListPage
