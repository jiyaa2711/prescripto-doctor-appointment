import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { getToken, setToken } from '../api/client'

const AppContext = createContext(null)

// Holds the logged-in user for the whole app.
// NOTE: the role stored here only decides what the UI shows. Every API call is
// still checked by the backend, so editing this in the browser grants nothing.
export const AppContextProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(!!getToken())

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  // On page load: if a token is saved, ask the backend who it belongs to
  useEffect(() => {
    if (!getToken()) return
    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => logout())
      .finally(() => setAuthLoading(false))
  }, [logout])

  // The API client fires this event when the backend answers 401
  useEffect(() => {
    window.addEventListener('auth:logout', logout)
    return () => window.removeEventListener('auth:logout', logout)
  }, [logout])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  return (
    <AppContext.Provider value={{ user, setUser, authLoading, login, register, logout }}>
      {children}
    </AppContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => useContext(AppContext)
