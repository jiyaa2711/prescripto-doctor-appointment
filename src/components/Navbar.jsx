import React, { useState } from 'react'
import { assets } from '../assets/assets'
import { NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { imageUrl } from '../api/client'
import { homeForRole } from '../utils/format'

const LINKS = [
  { to: '/', label: 'HOME' },
  { to: '/doctors', label: 'ALL DOCTORS' },
  { to: '/about', label: 'ABOUT' },
  { to: '/contact', label: 'CONTACT' },
]

const Navbar = () => {
  const navigate = useNavigate()
  const { user, logout } = useApp()
  const [showMenu, setShowMenu] = useState(false)       // mobile menu
  const [showDropdown, setShowDropdown] = useState(false) // profile dropdown

  const onLogout = () => {
    logout()
    setShowDropdown(false)
    navigate('/login')
  }

  return (
    <div className='flex items-center justify-between text-sm py-4 mb-5 border-b border-b-[#ADADAD]'>
      <img onClick={() => navigate('/')} className='w-44 cursor-pointer' src={assets.logo} alt='Prescripto' />

      <ul className='md:flex items-start gap-5 font-medium hidden'>
        {LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'} className='group'>
            {({ isActive }) => (
              <>
                <li className='py-1'>{link.label}</li>
                <hr className={`border-none outline-none h-0.5 bg-primary w-3/5 m-auto ${isActive ? '' : 'hidden'}`} />
              </>
            )}
          </NavLink>
        ))}
      </ul>

      <div className='flex items-center gap-4'>
        {user ? (
          <div className='flex items-center gap-2 cursor-pointer relative' onClick={() => setShowDropdown(!showDropdown)}>
            <img className='w-8 h-8 rounded-full object-cover' src={user.image ? imageUrl(user.image) : assets.profile_pic} alt='' />
            <img className='w-2.5' src={assets.dropdown_icon} alt='' />
            {showDropdown && (
              <div className='absolute top-0 right-0 pt-14 text-base font-medium text-gray-600 z-20'>
                <div className='min-w-48 bg-gray-50 rounded flex flex-col gap-4 p-4 shadow'>
                  {user.role === 'patient' ? (
                    <>
                      <p onClick={() => navigate('/my-profile')} className='hover:text-black cursor-pointer'>My Profile</p>
                      <p onClick={() => navigate('/my-appointment')} className='hover:text-black cursor-pointer'>My Appointments</p>
                    </>
                  ) : (
                    <p onClick={() => navigate(homeForRole(user.role))} className='hover:text-black cursor-pointer'>
                      {user.role === 'admin' ? 'Admin Panel' : 'Doctor Dashboard'}
                    </p>
                  )}
                  <p onClick={onLogout} className='hover:text-black cursor-pointer'>Logout</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => navigate('/login')} className='bg-primary text-white px-8 py-3 rounded-full font-light hidden md:block'>Create account</button>
        )}
        <img onClick={() => setShowMenu(true)} className='w-6 md:hidden cursor-pointer' src={assets.menu_icon} alt='Open menu' />

        {/* ---- Mobile menu ---- */}
        <div className={`md:hidden ${showMenu ? 'fixed w-full' : 'h-0 w-0'} right-0 top-0 bottom-0 z-30 overflow-hidden bg-white transition-all`}>
          <div className='flex items-center justify-between px-5 py-6'>
            <img src={assets.logo} className='w-36' alt='' />
            <img onClick={() => setShowMenu(false)} src={assets.cross_icon} className='w-7 cursor-pointer' alt='Close menu' />
          </div>
          <ul className='flex flex-col items-center gap-2 mt-5 px-5 text-lg font-medium'>
            {LINKS.map((link) => (
              <NavLink key={link.to} onClick={() => setShowMenu(false)} to={link.to} end={link.to === '/'}
                className={({ isActive }) => `px-4 py-2 rounded-full inline-block ${isActive ? 'bg-primary text-white' : ''}`}>
                {link.label}
              </NavLink>
            ))}
            {!user && (
              <NavLink onClick={() => setShowMenu(false)} to='/login' className='px-4 py-2 rounded-full inline-block border border-primary text-primary mt-2'>
                LOGIN / CREATE ACCOUNT
              </NavLink>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Navbar;
