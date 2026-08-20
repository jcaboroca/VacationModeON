import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  // Popup, not redirect: redirect relies on Firebase's authDomain iframe
  // relaying the result back via storage shared across sites, which browser
  // storage-partitioning silently breaks (getRedirectResult just resolves to
  // null, no error). Popup uses postMessage instead, which isn't affected —
  // a benign "Cross-Origin-Opener-Policy... window.closed" console warning
  // during the flow is expected and doesn't indicate failure.
  async function signInWithGoogle() {
    setAuthError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      if (err.code !== 'auth/cancelled-popup-request') {
        setAuthError(`${err.code}: ${err.message}`)
      }
    }
  }

  const signOutUser = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, loading, authError, signInWithGoogle, signOutUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
