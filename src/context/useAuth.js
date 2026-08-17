import { createContext, useContext } from 'react'

// Context nesnesi ve hook, AuthProvider bileseninden ayri bir dosyada duruyor.
// Sebebi: bir dosya hem bilesen hem baska seyler export ettiginde React Fast
// Refresh (HMR) o dosya icin devre disi kaliyor.
export const AuthContext = createContext(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth yalnızca <AuthProvider> içinde kullanılabilir.')
  }
  return context
}
