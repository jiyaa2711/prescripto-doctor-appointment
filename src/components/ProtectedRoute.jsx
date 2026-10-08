import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { homeForRole } from '../utils/format'

// Wraps routes that need a logged-in user with one of the given roles.
// This is a convenience for the UI only - the backend enforces the real permissions.
const ProtectedRoute = ({ roles }) => {
  const { user, authLoading } = useApp()
  const location = useLocation()

  if (authLoading) {
    return <div className='min-h-[60vh] flex items-center justify-center text-gray-500'>Loading...</div>
  }
  if (!user) return <Navigate to='/login' replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />

  return <Outlet />
}

export default ProtectedRoute
