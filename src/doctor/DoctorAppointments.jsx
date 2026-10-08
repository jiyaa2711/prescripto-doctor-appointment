import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import api, { errorMessage } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import AppointmentActions from '../components/AppointmentActions'
import { formatDate, formatTime } from '../utils/format'

// Table of the logged-in doctor's appointments (the backend only ever returns this doctor's own).
// Also used by the doctor dashboard.
export const DoctorAppointmentTable = ({ appointments, onChanged }) => (
  <div className='bg-white border rounded text-sm overflow-x-auto'>
    <table className='w-full min-w-[640px]'>
      <thead className='bg-gray-50 text-left text-gray-600'>
        <tr>
          <th className='px-4 py-3 font-medium'>Patient</th>
          <th className='px-4 py-3 font-medium'>Date & time</th>
          <th className='px-4 py-3 font-medium'>Reason</th>
          <th className='px-4 py-3 font-medium'>Status</th>
          <th className='px-4 py-3 font-medium'>Actions</th>
        </tr>
      </thead>
      <tbody>
        {appointments.map((a) => (
          <tr key={a._id} className='border-t align-top'>
            <td className='px-4 py-3'>
              <p className='text-gray-800'>{a.name}</p>
              <p className='text-xs text-gray-500'>{a.phone || a.email}</p>
            </td>
            <td className='px-4 py-3 whitespace-nowrap'>{formatDate(a.date)}<br /><span className='text-gray-500'>{formatTime(a.time)}</span></td>
            <td className='px-4 py-3 text-gray-600 max-w-56'>{a.reason || '–'}</td>
            <td className='px-4 py-3'><StatusBadge status={a.status} /></td>
            <td className='px-4 py-3'><AppointmentActions appointment={a} onChanged={onChanged} /></td>
          </tr>
        ))}
        {appointments.length === 0 && (
          <tr><td colSpan={5} className='px-4 py-6 text-center text-gray-500'>No appointments.</td></tr>
        )}
      </tbody>
    </table>
  </div>
)

const DoctorAppointments = () => {
  const [appointments, setAppointments] = useState([])
  const [filters, setFilters] = useState({ status: '', date: '' })

  const load = useCallback(() => {
    api.get('/appointments/doctor', { params: filters })
      .then(({ data }) => setAppointments(data.appointments))
      .catch((error) => toast.error(errorMessage(error)))
  }, [filters])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <h1 className='text-xl font-medium text-gray-700 mb-4'>My Appointments</h1>
      <div className='flex flex-wrap gap-2 mb-4 text-sm'>
        <input type='date' value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} className='border rounded px-3 py-2 bg-white' aria-label='Filter by date' />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className='border rounded px-3 py-2 bg-white'>
          <option value=''>All statuses</option>
          <option value='booked'>Booked</option>
          <option value='confirmed'>Confirmed</option>
          <option value='completed'>Completed</option>
          <option value='cancelled'>Cancelled</option>
        </select>
        <button onClick={() => setFilters({ status: '', date: '' })} className='px-3 py-2 border rounded bg-white'>Clear</button>
      </div>
      <DoctorAppointmentTable appointments={appointments} onChanged={load} />
    </div>
  )
}

export default DoctorAppointments
