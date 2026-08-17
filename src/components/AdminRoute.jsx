import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { isAdminEmail } from '../utils/admin'
import Spinner from './Spinner'

/**
 * Yalnizca .env'deki VITE_ADMIN_EMAIL ile eslesen kullaniciyi gecirir.
 *
 * Bu arayuz seviyesinde bir kontroldur; gercek yetkilendirme Firestore
 * Security Rules'ta yapilmalidir (bkz. src/utils/admin.js).
 */
export default function AdminRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <Spinner full label="Yetki kontrol ediliyor…" />

  // Giris yapmamissa once giris yapsin, sonra buraya donsun.
  if (!user) {
    return <Navigate to="/login" replace state={{ from: '/admin' }} />
  }

  // Giris yapmis ama admin degilse sessizce ana sayfaya gonder.
  if (!isAdminEmail(user.email)) return <Navigate to="/" replace />

  return children
}
