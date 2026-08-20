import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// No Storage: as of late 2024 Firebase requires the Blaze (pay-as-you-go)
// plan to enable Storage, even for free-tier usage. Staying on Spark for
// now means the journal is text-only — see docs/superpowers/specs.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// Client-side convenience only — NOT a security boundary. The real access
// control lives in firestore.rules, which hardcode the owner's email
// server-side. This is just used to greet the right person and to
// short-circuit the UI if someone else's Google account signs in.
export const OWNER_EMAIL = import.meta.env.VITE_OWNER_EMAIL
