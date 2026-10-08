import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import api, { errorMessage } from '../api/client'
import { assets } from '../assets/assets'
import StatCard from '../components/StatCard'
import { DoctorAppointmentTable } from './DoctorAppointments'
import { currency, toDateString } from '../utils/format'

const DoctorDashboard = () => {
  const [appointments, setAppointments] = useState(null)

  const load = useCallback(() => {
    api.get('/appointments/doctor')
      .then(({ data }) => setAppointments(data.appointments))
      .catch((error) => toast.error(errorMessage(error)))
  }, [])

  useEffect(() => { load() }, [load])

  if (!appointments) return <p className='text-gray-500'>Loading...</p>

  const today = toDateString(new Date())
  const completed = appointments.filter((a) => a.status === 'completed')
  const upcoming = appointments.filter((a) => ['booked', 'confirmed'].includes(a.status) && a.date >= today)
  const patients = new Set(appointments.map((a) => a.user)).size
  const earnings = completed.reduce((sum, a) => sum + (a.fees || 0), 0)

  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-medium text-gray-700'>Dashboard</h1>
      <div className='flex flex-wrap gap-3'>
        <StatCard icon={assets.earning_icon} label='Earnings (completed)' value={`${currency}${earnings}`} />
        <StatCard icon={assets.appointments_icon} label='Upcoming appointments' value={upcoming.length} />
        <StatCard icon={assets.patients_icon} label='Patients' value={patients} />
      </div>

      <div>
        <p className='font-medium text-gray-700 mb-2'>Today & upcoming</p>
        <DoctorAppointmentTable appointments={upcoming.slice(0, 10)} onChanged={load} />
      </div>
    </div>
  )
}

export default DoctorDashboard
