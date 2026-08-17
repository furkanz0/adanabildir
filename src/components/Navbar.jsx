import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Inbox, LogOut, Map, Menu, Plus, ShieldCheck, X } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '../context/useAuth'
import { isAdminEmail } from '../utils/admin'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [menuOpen, setMenuOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const navRef = useRef(null)
  const toggleRef = useRef(null)

  // Sayfa degisince mobil menu acik kalmasin.
  // Odagi geri vermiyoruz: yeni sayfaya gecen kullanicinin odagi hamburger
  // butonuna zorlamak yon kaybettirir.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  /**
   * Menuyu kapat. `restoreFocus` yalnizca kullanicinin KENDI kapatma
   * eyleminde true olmali (Escape, perde, hamburger) — sayfa degisiminde
   * odagi geri almak yanlis olur.
   */
  const closeMenu = useCallback(({ restoreFocus = false } = {}) => {
    setMenuOpen(false)
    if (restoreFocus) toggleRef.current?.focus()
  }, [])

  /**
   * Mobil menu acikken:
   *   - arka plani `inert` yapiyoruz (hem sekme sirasindan hem ekran
   *     okuyucudan cikar, ustune tiklanamaz)
   *   - Tab dongusunu menu icinde tutuyoruz
   *   - Escape kapatiyor
   *
   * Neden gerekliydi: perde olmadan menu acikken arkadaki bagalantilar
   * sekmeyle geziliyordu — kullanici gorunmeyen bir ogeye odaklanabiliyordu.
   *
   * `role="dialog"` BILEREK eklenmedi: bu bir gezinme cekmecesi, <nav>
   * isaretini kaybetmek istemiyoruz. inert + aria-expanded dogru desen.
   */
  useEffect(() => {
    if (!menuOpen) return undefined

    const nav = navRef.current
    if (!nav) return undefined

    const background = [
      document.getElementById('main-content'),
      document.querySelector('.footer'),
    ].filter(Boolean)
    for (const el of background) el.setAttribute('inert', '')

    const focusables = () =>
      [
        ...nav.querySelectorAll(
          'a[href], button:not([disabled]), select, input, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null)

    focusables()[0]?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeMenu({ restoreFocus: true })
        return
      }
      if (event.key !== 'Tab') return

      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      for (const el of background) el.removeAttribute('inert')
    }
  }, [menuOpen, closeMenu])

  // Mobilden masaustune genisletilirse cekmece kavrami ortadan kalkiyor;
  // acik kalan menu ve perde ekranda takili kalmasin.
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 861px)')
    const onChange = (event) => {
      if (event.matches) setMenuOpen(false)
    }
    wide.addEventListener('change', onChange)
    return () => wide.removeEventListener('change', onChange)
  }, [])

  async function handleLogout() {
    setBusy(true)
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('[auth] cikis hatasi:', error)
    } finally {
      setBusy(false)
    }
  }

  const isAdmin = isAdminEmail(user?.email)

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand" aria-label="AdanaBildir ana sayfa">
          <Logo size={34} />
        </Link>

        <button
          type="button"
          ref={toggleRef}
          className="navbar__toggle"
          onClick={() =>
            menuOpen ? closeMenu({ restoreFocus: true }) : setMenuOpen(true)
          }
          aria-expanded={menuOpen}
          aria-controls="navbar-nav"
          aria-label={menuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav
          id="navbar-nav"
          ref={navRef}
          className={menuOpen ? 'navbar__nav is-open' : 'navbar__nav'}
        >
          {/* Iki kume: solda "nereye gidebilirim", sagda "ne yapabilirim /
              kimim". Hepsi tek sirada sagda toplaninca serit ortadan bos
              kaliyordu ve gezinme ile hesap ayni agirlikta okunuyordu. */}
          <div className="navbar__links">
            <NavLink to="/" className="navbar__link" end>
              <Map size={16} aria-hidden="true" />
              Harita
            </NavLink>

            {user ? (
              <>
                <NavLink to="/my-reports" className="navbar__link">
                  <Inbox size={16} aria-hidden="true" />
                  Bildirimlerim
                </NavLink>
                {isAdmin ? (
                  <NavLink to="/admin" className="navbar__link">
                    <ShieldCheck size={16} aria-hidden="true" />
                    Admin
                  </NavLink>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="navbar__actions">
            {user ? (
              <>
                {/* Vatandasin buraya gelme sebebi bu. Digerleriyle ayni
                    agirlikta duz bir baglantiyken kayboluyordu; tek dolu amber
                    ogeye yukseltildi. Kural bozulmuyor: dolu amber ayni anda
                    tek yerde olmali ve "Kayit Ol" yalnizca cikis yapmisken
                    var. */}
                <NavLink to="/new-report" className="navbar__cta">
                  <span className="navbar__cta-icon" aria-hidden="true">
                    <Plus size={15} />
                  </span>
                  Bildir
                </NavLink>

                <span className="navbar__account" title={user.email}>
                  <span className="navbar__avatar" aria-hidden="true">
                    {(user.email?.[0] ?? '?').toLocaleUpperCase('tr')}
                  </span>
                  <span className="navbar__email">{user.email}</span>
                </span>

                <button
                  type="button"
                  className="navbar__logout"
                  onClick={handleLogout}
                  disabled={busy}
                >
                  <LogOut size={15} aria-hidden="true" />
                  {busy ? 'Çıkılıyor…' : 'Çıkış'}
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="navbar__link">
                  Giriş Yap
                </NavLink>
                <NavLink to="/register" className="btn btn--accent btn--sm">
                  Kayıt Ol
                </NavLink>
              </>
            )}
          </div>
        </nav>
      </div>

      {/* Perde. Iki isi var: arka planin devre disi oldugunu GORSEL olarak
          soylemek ve dokunarak kapatma alani sunmak.
          aria-hidden: kapatmanin erisilebilir yollari zaten var (hamburger
          butonu ve Escape); perdeyi ayrica sekme sirasina sokmak gereksiz
          bir duraktan baska bir sey olmazdi. */}
      {menuOpen ? (
        <div
          className="navbar__scrim"
          onClick={() => closeMenu({ restoreFocus: true })}
          aria-hidden="true"
        />
      ) : null}
    </header>
  )
}
