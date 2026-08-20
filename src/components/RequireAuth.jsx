import { useAuth } from '../context/AuthContext'
import { OWNER_EMAIL } from '../firebase'
import Login from './Login'

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading-screen">Cargando…</div>
  }

  if (!user) {
    return <Login />
  }

  if (OWNER_EMAIL && user.email !== OWNER_EMAIL) {
    return <Login wrongAccount />
  }

  return children
}
