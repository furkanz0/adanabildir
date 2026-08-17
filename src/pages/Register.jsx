import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import SetupNotice from '../components/SetupNotice'
import Spinner from '../components/Spinner'
import { useAuth } from '../context/useAuth'
import { getAuthErrorMessage } from '../firebase/authErrors'
import { revealField, revealFirstError } from '../utils/formFocus'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 6

export default function Register() {
  const { register, user, loading, isFirebaseConfigured } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
  })
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

  if (user) return <Navigate to="/" replace />

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    setFormError('')
  }

  /**
   * Tek bir alani dogrular. `state` parametresi gerekli cunku sifre tekrari
   * kendi basina degil, sifreyle karsilastirilarak dogrulaniyor.
   */
  function validateField(name, value, state) {
    if (name === 'email') {
      if (!value.trim()) return 'E-posta adresi gerekli.'
      if (!EMAIL_PATTERN.test(value.trim()))
        return 'Geçerli bir e-posta adresi girin.'
    }

    if (name === 'password') {
      if (!value) return 'Şifre gerekli.'
      if (value.length < MIN_PASSWORD_LENGTH)
        return `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`
    }

    if (name === 'passwordConfirm') {
      if (!value) return 'Şifreyi tekrar girin.'
      if (state.password !== value) return 'Şifreler eşleşmiyor.'
    }

    return ''
  }

  // Alandan cikildiginda dogrula — yazarken degil.
  function handleBlur(event) {
    const { name, value } = event.target
    setFieldErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value, form),
    }))
  }

  function validate() {
    const errors = {}
    for (const name of ['email', 'password', 'passwordConfirm']) {
      const message = validateField(name, form[name], form)
      if (message) errors[name] = message
    }
    return errors
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const errors = validate()
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      revealFirstError([
        { id: 'email', error: errors.email },
        { id: 'password', error: errors.password },
        { id: 'passwordConfirm', error: errors.passwordConfirm },
      ])
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      await register(form.email, form.password)
      // Firebase kayittan sonra kullaniciyi otomatik oturum acmis sayar.
      navigate('/', { replace: true })
    } catch (error) {
      setFormError(getAuthErrorMessage(error))
      revealField('register-form-error', { focus: false })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page page--centered">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <Logo size={34} className="auth-card__brand" />

        <h1 className="auth-card__title">Kayıt Ol</h1>
        <p className="auth-card__subtitle">
          Şehrinizdeki sorunları bildirmek için hesap oluşturun.
        </p>

        {formError ? (
          <div
            id="register-form-error"
            className="alert alert--error"
            role="alert"
          >
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
            aria-describedby={fieldErrors.email ? 'reg-email-error' : undefined}
          />
          {fieldErrors.email ? (
            <span id="reg-email-error" className="field__error" role="alert">
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
            placeholder="En az 6 karakter"
            autoComplete="new-password"
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? 'reg-password-error' : undefined
            }
          />
          {fieldErrors.password ? (
            <span id="reg-password-error" className="field__error" role="alert">
              {fieldErrors.password}
            </span>
          ) : null}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="passwordConfirm">
            Şifre (Tekrar)
          </label>
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            className={
              fieldErrors.passwordConfirm ? 'input input--invalid' : 'input'
            }
            value={form.passwordConfirm}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="••••••"
            autoComplete="new-password"
            disabled={submitting}
            aria-invalid={Boolean(fieldErrors.passwordConfirm)}
            aria-describedby={
              fieldErrors.passwordConfirm ? 'reg-confirm-error' : undefined
            }
          />
          {fieldErrors.passwordConfirm ? (
            <span id="reg-confirm-error" className="field__error" role="alert">
              {fieldErrors.passwordConfirm}
            </span>
          ) : null}
        </div>

        <button
          type="submit"
          className="btn btn--accent btn--block"
          disabled={submitting}
        >
          {submitting ? 'Hesap oluşturuluyor…' : 'Kayıt Ol'}
        </button>

        <p className="auth-card__footer">
          Zaten hesabınız var mı? <Link to="/login">Giriş yapın</Link>
        </p>
      </form>
    </div>
  )
}
