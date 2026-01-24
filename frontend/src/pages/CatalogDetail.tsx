import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { API_BASE, fetchJson, formatDate, resolveLink } from '../lib/catalog'
import type { CatalogDetail } from '../lib/catalog'

type LocationState = {
  from?: string
}

function CatalogDetailPage() {
  const { entryId } = useParams()
  const location = useLocation()
  const fromState = (location.state as LocationState | null)?.from ?? ''
  const backSearch = fromState && fromState.startsWith('?') ? fromState : ''

  const [detail, setDetail] = useState<CatalogDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!entryId) return
    const loadDetail = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchJson<CatalogDetail>(
          `${API_BASE}/catalog/${entryId}`
        )
        setDetail(data)
      } catch (err) {
        setError('詳細の取得に失敗しました。')
      } finally {
        setLoading(false)
      }
    }
    loadDetail()
  }, [entryId])

  return (
    <div className="detail-page">
      <header className="detail-header">
        <Link
          to={backSearch ? { pathname: '/', search: backSearch } : '/'}
          className="secondary"
        >
          一覧へ戻る
        </Link>
      </header>

      {loading && <p className="status">詳細を取得中...</p>}
      {error && <p className="status error">{error}</p>}

      {detail && !loading && (
        <section className="detail-card">
          <h1>{detail.name || detail.id}</h1>
          {detail.shortDescription && (
            <p className="description">{detail.shortDescription}</p>
          )}
          {detail.longDescription && (
            <p className="long-description">{detail.longDescription}</p>
          )}

          <div className="detail-meta">
            {detail.categories.map((value) => (
              <span key={value} className="chip">
                {value}
              </span>
            ))}
            {detail.platforms.map((value) => (
              <span key={value} className="chip subtle">
                {value}
              </span>
            ))}
          </div>

          <div className="detail-list">
            {detail.license && (
              <div>
                <strong>License:</strong> {detail.license}
              </div>
            )}
            {detail.developmentStatus && (
              <div>
                <strong>Status:</strong> {detail.developmentStatus}
              </div>
            )}
            {detail.releaseDate && (
              <div>
                <strong>Release:</strong> {formatDate(detail.releaseDate)}
              </div>
            )}
            {detail.softwareVersion && (
              <div>
                <strong>Version:</strong> {detail.softwareVersion}
              </div>
            )}
            {detail.languages.length > 0 && (
              <div>
                <strong>Languages:</strong> {detail.languages.join(', ')}
              </div>
            )}
            {detail.sourceFile && (
              <div>
                <strong>Source:</strong> {detail.sourceFile}
              </div>
            )}
          </div>

          <div className="detail-actions">
            {resolveLink(detail) && (
              <a href={resolveLink(detail)} target="_blank" rel="noreferrer">
                Visit
              </a>
            )}
            {detail.url && (
              <a href={detail.url} target="_blank" rel="noreferrer">
                Repository
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

export default CatalogDetailPage
