import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import Spinner from './Spinner'

/**
 * Giris yapmamis kullaniciyi /login'e yonlendirir.
 *
 * Bu hafta korunacak bir sayfa henuz yok; altyapi hazir bekliyor.
 * Ileride su sekilde kullanilacak:
 *
 *   <Route
 *     path="/new-report"
 *     element={
 *       <ProtectedRoute>
 *         <NewReport />
 *       </ProtectedRoute>
 *     }
 *   />
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Oturum durumu Firebase'den gelene kadar bekle; aksi halde sayfa yenilendiginde
  // giris yapmis kullanici bir an icin /login'e atilir.
  if (loading) return <Spinner full label="Oturum kontrol ediliyor…" />

  if (!user) {
    // `from` bilgisini tasiyoruz ki giristen sonra kullaniciyi geri gonderebilelim.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
