import { useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../firebase/config'
import { AuthContext } from './useAuth'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // .env doldurulmadiysa auth nesnesi yok; uygulamayi kilitlemeden devam et.
    if (!auth) {
      setLoading(false)
      return undefined
    }

    // onAuthStateChanged bir "unsubscribe" fonksiyonu dondurur; useEffect'in
    // temizleme fonksiyonu olarak dogrudan geri veriyoruz.
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isFirebaseConfigured,
      register: (email, password) =>
        createUserWithEmailAndPassword(auth, email.trim(), password),
      login: (email, password) =>
        signInWithEmailAndPassword(auth, email.trim(), password),
      logout: () => signOut(auth),
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
