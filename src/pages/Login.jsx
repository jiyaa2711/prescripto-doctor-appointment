import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useApp } from '../context/AppContext';
import { errorMessage } from '../api/client';
import { homeForRole } from '../utils/format';

// One login page for patients, doctors and admins - the backend tells us the role.
// "Sign Up" always creates a patient account.
const Login = () => {
  const { user, login, register } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState('Login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Already logged in -> go to the page they came from, or their home
  useEffect(() => {
    if (user) navigate(location.state?.from || homeForRole(user.role), { replace: true })
  }, [user, navigate, location.state])

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (mode === 'Sign Up') {
        await register(name, email, password)
        toast.success('Account created')
      } else {
        await login(email, password)
      }
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className='min-h-[80vh] flex items-center'>
      <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[300px] sm:min-w-96 border rounded-xl text-zinc-600 text-sm shadow-lg'>
        <p className='text-2xl font-semibold'>{mode === 'Sign Up' ? 'Create Account' : 'Login'}</p>
        <p>Please {mode === 'Sign Up' ? 'sign up' : 'log in'} to book appointment</p>

        {mode === 'Sign Up' && (
          <div className='w-full'>
            <label htmlFor='name'>Full Name</label>
            <input id='name' className='border border-zinc-300 rounded w-full p-2 mt-1' type='text' value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
          </div>
        )}
        <div className='w-full'>
          <label htmlFor='email'>Email</label>
          <input id='email' className='border border-zinc-300 rounded w-full p-2 mt-1' type='email' value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete='email' />
        </div>
        <div className='w-full'>
          <label htmlFor='password'>Password</label>
          <input id='password' className='border border-zinc-300 rounded w-full p-2 mt-1' type='password' value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'Sign Up' ? 8 : undefined} autoComplete={mode === 'Sign Up' ? 'new-password' : 'current-password'} />
          {mode === 'Sign Up' && <p className='text-xs text-zinc-400 mt-1'>At least 8 characters</p>}
        </div>

        <button type='submit' disabled={submitting} className='bg-primary text-white w-full py-2 rounded-md text-base disabled:opacity-60'>
          {submitting ? 'Please wait...' : mode === 'Sign Up' ? 'Create Account' : 'Login'}
        </button>

        {mode === 'Sign Up'
          ? <p>Already have an account? <span onClick={() => setMode('Login')} className='text-primary underline cursor-pointer'>Login here</span></p>
          : <p>Create a new account? <span onClick={() => setMode('Sign Up')} className='text-primary underline cursor-pointer'>Click here</span></p>}
      </div>
    </form>
  );
}

export default Login;
