import { useAuth } from '../context/AuthContext'
import { OWNER_EMAIL } from '../firebase'

export default function Login({ wrongAccount }) {
  const { signInWithGoogle, signOutUser } = useAuth()

  return (
    <div className="login-screen">
      <div className="login-odometer">000000</div>
      <h1 className="login-title">
        Vacation
        <br />
        Mode<span className="login-title-on">ON</span>
      </h1>
      <p className="login-subtitle">Planificador de viajes en camper</p>

      {wrongAccount ? (
        <>
          <p className="login-error">
            Esa cuenta de Google no tiene acceso a esta app.
            {OWNER_EMAIL ? ` Inicia sesión con ${OWNER_EMAIL}.` : ''}
          </p>
          <button className="login-button" onClick={signOutUser}>
            Probar con otra cuenta
          </button>
        </>
      ) : (
        <button className="login-button" onClick={signInWithGoogle}>
          Arrancar con Google
        </button>
      )}
    </div>
  )
}
