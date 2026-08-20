import { Route, BrowserRouter as Router, Routes, Link } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import TripList from './routes/TripList'
import TripDashboard from './routes/TripDashboard'
import PackingList from './routes/PackingList'

function Header() {
  const { user, signOutUser } = useAuth()
  return (
    <header className="app-header">
      <Link to="/">
        Vacation Mode<span>ON</span>
      </Link>
      <div className="app-header-user">
        {user?.displayName}
        <button type="button" className="app-header-signout" onClick={signOutUser}>
          Salir
        </button>
      </div>
    </header>
  )
}

function Shell() {
  return (
    <RequireAuth>
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<TripList />} />
          <Route path="/trip/:tripId" element={<TripDashboard />} />
          <Route path="/trip/:tripId/lista" element={<PackingList />} />
        </Routes>
      </main>
    </RequireAuth>
  )
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </Router>
  )
}
