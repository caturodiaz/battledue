import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isRegister = mode === 'register'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    const result = isRegister
      ? await signUp({ email, password, displayName })
      : await signIn({ email, password })

    if (result.error) {
      setError(result.error.message)
    } else if (isRegister && !result.data?.session) {
      setMessage('Cuenta creada. Revisá tu correo para confirmar la cuenta antes de iniciar sesión.')
    } else if (isRegister) {
      setMessage('Cuenta creada correctamente.')
    }

    setSubmitting(false)
  }

  const switchMode = () => {
    setMode((currentMode) => (currentMode === 'login' ? 'register' : 'login'))
    setError('')
    setMessage('')
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-card-header">
          <p className="eyebrow">BattleDue</p>
          <h1 id="auth-title">
            {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
          </h1>
          <p>
            {isRegister
              ? 'Creá tu cuenta para guardar tus personajes y participar en batallas.'
              : 'Entrá para acceder a tus personajes y futuras batallas online.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <label className="field">
              Nombre para mostrar
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Charlie"
                autoComplete="name"
                required
                maxLength={40}
              />
            </label>
          )}

          <label className="field">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
              minLength={6}
            />
          </label>

          {error && <p className="error auth-message">{error}</p>}
          {message && <p className="notice auth-message">{message}</p>}

          <button className="button auth-submit" type="submit" disabled={submitting}>
            {submitting
              ? 'Procesando...'
              : isRegister
                ? 'Crear cuenta'
                : 'Entrar'}
          </button>
        </form>

        <div className="auth-switch">
          <span>
            {isRegister ? '¿Ya tenés una cuenta?' : '¿Todavía no tenés cuenta?'}
          </span>
          <button type="button" onClick={switchMode}>
            {isRegister ? 'Iniciar sesión' : 'Registrarme'}
          </button>
        </div>
      </section>
    </main>
  )
}

export default AuthPage
