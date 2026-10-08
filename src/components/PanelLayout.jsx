import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { useApp } from '../context/AppContext'

// Shared layout for the Admin panel and the Doctor panel: top bar + sidebar + page content.
// links: [{ to, label, icon, end? }]
const PanelLayout = ({ title, links }) => {
  const { user, logout } = useApp()
  const navigate = useNavigate()

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className='min-h-screen bg-[#F8F9FD]'>
      {/* Top bar */}
      <div className='flex justify-between items-center px-4 sm:px-10 py-3 border-b bg-white'>
        <div className='flex items-center gap-2 text-xs'>
          <img onClick={() => navigate('/')} className='w-28 sm:w-40 cursor-pointer' src={assets.admin_logo} alt='Prescripto' />
          <p className='border px-2.5 py-0.5 rounded-full border-gray-500 text-gray-600'>{title}</p>
        </div>
        <div className='flex items-center gap-3'>
          <p className='hidden sm:block text-sm text-gray-600'>{user?.name}</p>
          <button onClick={onLogout} className='bg-primary text-white text-sm px-6 sm:px-10 py-2 rounded-full'>Logout</button>
        </div>
      </div>

      <div className='flex min-h-[calc(100vh-61px)]'>
        {/* Sidebar: icons only on small screens, icons + labels from md up */}
        <nav className='bg-white border-r shrink-0'>
          <ul className='text-[#515151] mt-5'>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                title={link.label}
                className={({ isActive }) =>
                  `flex items-center gap-3 py-3.5 px-3 md:px-9 md:min-w-72 cursor-pointer ${isActive ? 'bg-[#F2F3FF] border-r-4 border-primary' : ''}`
                }
              >
                <img className='w-5' src={link.icon} alt='' />
                <p className='hidden md:block'>{link.label}</p>
              </NavLink>
            ))}
          </ul>
        </nav>

        <main className='flex-1 min-w-0 p-4 sm:p-6'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default PanelLayout
