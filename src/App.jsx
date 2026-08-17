import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from './components/AdminRoute'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Spinner from './components/Spinner'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'

// Ana sayfa (harita) dogrudan yukleniyor — acilis sayfasi o.
// Digerleri talep uzerine: haritaya bakan bir ziyaretci admin panelinin,
// bildirim formunun veya kayit ekraninin kodunu indirmek zorunda degil.
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ReportDetail = lazy(() => import('./pages/ReportDetail'))
const NewReport = lazy(() => import('./pages/NewReport'))
const MyReports = lazy(() => import('./pages/MyReports'))
const Admin = lazy(() => import('./pages/Admin'))

function Shell() {
  const mainRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)

  // Sayfa icerigi kaydirildiginda navbar'a golge dusur. Kaydirma .page
  // elemaninda gerceklesiyor ve scroll olayi kabarmiyor, bu yuzden yakalama
  // (capture) evresinde dinliyoruz.
  useEffect(() => {
    const element = mainRef.current
    if (!element) return undefined

    const handleScroll = (event) => {
      const next = (event.target?.scrollTop ?? 0) > 8
      setScrolled((previous) => (previous === next ? previous : next))
    }

    element.addEventListener('scroll', handleScroll, {
      passive: true,
      capture: true,
    })

    return () =>
      element.removeEventListener('scroll', handleScroll, { capture: true })
  }, [])

  return (
    <div className="app" data-scrolled={scrolled ? 'true' : 'false'}>
      {/* Klavye kullanicisi her sayfada navbar'i tek tek gecmek zorunda
          kalmasin. Yalnizca odaklanildiginda gorunur. */}
      <a href="#main-content" className="skip-link">
        İçeriğe geç
      </a>

      <Navbar />

      <main
        className="app__main"
        id="main-content"
        tabIndex={-1}
        ref={mainRef}
      >
        <Suspense
          fallback={
            <div className="page page--centered">
              <Spinner full label="Sayfa yükleniyor…" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Detay sayfasi herkese acik: harita panelinden link veriliyor */}
            <Route path="/report/:id" element={<ReportDetail />} />

            {/* Korumali: giris yapmamis kullanici /login'e yonlendirilir */}
            <Route
              path="/new-report"
              element={
                <ProtectedRoute>
                  <NewReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-reports"
              element={
                <ProtectedRoute>
                  <MyReports />
                </ProtectedRoute>
              }
            />

            {/* Yalnizca VITE_ADMIN_EMAIL ile eslesen kullanici */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  )
}
