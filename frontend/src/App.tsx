import { Navigate, Route, Routes } from 'react-router-dom'
import CatalogDetailPage from './pages/CatalogDetail'
import CatalogListPage from './pages/CatalogList'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<CatalogListPage />} />
      <Route path="/catalog/:entryId" element={<CatalogDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
