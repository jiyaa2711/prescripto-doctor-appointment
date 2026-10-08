import axios from 'axios'

export const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const TOKEN_KEY = 'token'

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* storage blocked - user just stays logged in for this tab */ }
}

// One axios instance for the whole app. Every request automatically carries the JWT.
const api = axios.create({ baseURL: `${backendUrl}/api`, timeout: 20000 })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// If the backend says the session is invalid, tell the app to log out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      window.dispatchEvent(new Event('auth:logout'))
    }
    return Promise.reject(error)
  }
)

// Friendly error message from an axios error
export const errorMessage = (error) =>
  error.response?.data?.message || (error.code === 'ECONNABORTED' ? 'The server took too long to respond' : 'Could not reach the server. Please try again.')

// "/uploads/doctors/doc1.png" -> "http://localhost:5000/uploads/doctors/doc1.png"
export const imageUrl = (path) => (!path ? '' : path.startsWith('http') ? path : `${backendUrl}${path}`)

export default api
