import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import SetupNotice from '../components/SetupNotice'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/useAuth'
import { getAuthErrorMessage } from '../firebase/authErrors'
import { revealField, revealFirstError } from '../utils/formFocus'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Login() {
  const { login, user, loading, isFirebaseConfigured } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isFirebaseConfigured) {
    return (
      <div className="page page--centered">
        <SetupNotice />
      </div>
    )
  }

  if (loading) return <Spinner full label="Oturum kontrol ediliyor…" />

  // Zaten giris yapmis kullaniciyi login sayfasinda tutmanin anlami yok.
  if (user) return <Navigate to={location.state?.from ?? '/'} replace />

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    setFormError('')
  }

  /** Tek bir alanı doğrular — hem blur'da hem gönderimde aynı kural. */
  function validateField(name, value) {
    if (name === 'email') {
      if (!value.trim()) return 'E-posta adresi gerekli.'
      if (!EMAIL_PATTERN.test(value.trim()))
        return 'Geçerli bir e-posta adresi girin.'
    }
    if (name === 'password' && !value) return 'Şifre gerekli.'
    return ''
  }

  // Alandan çıkıldığında doğrula. Yazarken uyarmıyoruz (handleChange hatayı
  // temizliyor); kullanıcı alanı bitirdiğinde geri bildirim veriyoruz.
  function handleBlur(event) {
    const { name, value } = event.target
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  function validate() {
    const errors = {}
    for (const name of ['email', 'password']) {
      const message = validateField(name, form[name])
      if (message) errors[name] = message
    }
    return errors
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const errors = validate()
    setFieldErrors(errors)

    // Kart kisa oldugu icin burada kaydirma cogu zaman is yapmiyor; asil
    // kazanc odagin ilk hatali alana gitmesi. Mobilde klavye acikken ya da
    // kisa bir pencerede kaydirma da devreye giriyor.
    if (Object.keys(errors).length > 0) {
      revealFirstError([
        { id: 'email', error: errors.email },
        { id: 'password', error: errors.password },
      ])
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      await login(form.email, form.password)
      navigate(location.state?.from ?? '/', { replace: true })
    } catch (error) {
      setFormError(getAuthErrorMessage(error))
      // "Şifre hatalı" gibi sunucu hatasi kartin basinda beliriyor.
      revealField('login-form-error', { focus: false })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page page--centered">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <Logo size={34} className="auth-card__brand" />

        <h1 className="auth-card__title">Giriş Yap</h1>
        <p className="auth-card__subtitle">
          Bildirim oluşturmak için hesabınıza giriş yapın.
        </p>

        {formError ? (
          <div id="login-form-error" className="alert alert--error" role="alert">
            {formError}
          </div>
        ) : null}

        <div className="field">
          <label className="field__label" htmlFor="email">
            E-posta
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={fieldErrors.email ? 'input input--invalid' : 'input'}
            value={form.email}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="ornek@eposta.com"
            autoComplete="email"
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
          />
          {fieldErrors.email ? (
            <span id="login-email-error" className="field__error" role="alert">
              {fieldErrors.email}
            </span>
          ) : null}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="password">
            Şifre
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className={fieldErrors.password ? 'input input--invalid' : 'input'}
            value={form.password}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="••••••"
            autoComplete="current-password"
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? 'login-password-error' : undefined
            }
          />
          {fieldErrors.password ? (
            <span id="login-password-error" className="field__error" role="alert">
              {fieldErrors.password}
            </span>
          ) : null}
        </div>

        <button
          type="submit"
          className="btn btn--primary btn--block"
          disabled={submitting}
        >
          {submitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </button>

        <p className="auth-card__footer">
          Hesabınız yok mu? <Link to="/register">Kayıt olun</Link>
        </p>
      </form>
    </div>
  )
}
