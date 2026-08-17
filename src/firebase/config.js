import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// .env henuz doldurulmadiysa Firebase'i baslatmayi denemiyoruz; aksi halde
// uygulama acilir acilmaz "invalid-api-key" hatasiyla cokerdi. Bunun yerine
// arayuzde anlasilir bir uyari gosteriyoruz (bkz. SetupNotice bileseni).
export const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => typeof value === 'string' && value.trim() !== '',
)

let app = null
let auth = null
let db = null

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
} else {
  console.warn(
    '[Firebase] Yapilandirma eksik. Proje kokundeki .env dosyasini doldurup ' +
      'gelistirme sunucusunu yeniden baslatin.',
  )
}

export { app, auth, db }
