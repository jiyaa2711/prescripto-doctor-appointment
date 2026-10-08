import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import api, { errorMessage, imageUrl } from '../api/client'
import Pagination from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'
import AppointmentActions from '../components/AppointmentActions'
import { currency, formatDate, formatTime } from '../utils/format'

const EMPTY_FILTERS = { search: '', status: '', doctor: '', date: '', page: 1 }

const Appointments = () => {
  const [doctors, setDoctors] = useState([])
  const [result, setResult] = useState({ appointments: [], total: 0, page: 1, pages: 1 })
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  // doctor dropdown options
  useEffect(() => {
    api.get('/admin/doctors').then(({ data }) => setDoctors(data.doctors)).catch(() => {})
  }, [])

  const loadAppointments = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/appointments', { params: filters })
      setResult(data)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }, [filters])

  useEffect(() => {
    const timer = setTimeout(loadAppointments, 300)
    return () => clearTimeout(timer)
  }, [loadAppointments])

  const setFilter = (key) => (e) => setFilters({ ...filters, [key]: e.target.value, page: 1 })

  return (
    <div>
      <h1 className='text-xl font-medium text-gray-700 mb-4'>All Appointments <span className='text-sm text-gray-500'>({result.total})</span></h1>

      <div className='flex flex-wrap gap-2 mb-4 text-sm'>
        <input value={filters.search} onChange={setFilter('search')} placeholder='Search patient name or email' className='border rounded px-3 py-2 bg-white flex-1 min-w-48' />
        <input type='date' value={filters.date} onChange={setFilter('date')} className='border rounded px-3 py-2 bg-white' aria-label='Filter by date' />
        <select value={filters.doctor} onChange={setFilter('doctor')} className='border rounded px-3 py-2 bg-white max-w-56'>
          <option value=''>All doctors</option>
          {doctors.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>
        <select value={filters.status} onChange={setFilter('status')} className='border rounded px-3 py-2 bg-white'>
          <option value=''>All statuses</option>
          <option value='booked'>Booked</option>
          <option value='confirmed'>Confirmed</option>
          <option value='completed'>Completed</option>
          <option value='cancelled'>Cancelled</option>
        </select>
        <button onClick={() => setFilters(EMPTY_FILTERS)} className='px-3 py-2 border rounded bg-white'>Clear</button>
      </div>

      <div className='bg-white border rounded text-sm overflow-x-auto'>
        <table className='w-full min-w-[800px]'>
          <thead className='bg-gray-50 text-left text-gray-600'>
            <tr>
              <th className='px-4 py-3 font-medium'>Patient</th>
              <th className='px-4 py-3 font-medium'>Doctor</th>
              <th className='px-4 py-3 font-medium'>Date & time</th>
              <th className='px-4 py-3 font-medium'>Fees</th>
              <th className='px-4 py-3 font-medium'>Status</th>
              <th className='px-4 py-3 font-medium'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {result.appointments.map((a) => (
              <tr key={a._id} className='border-t hover:bg-gray-50 align-top'>
                <td className='px-4 py-3'>
                  <p className='text-gray-800'>{a.name}</p>
                  <p className='text-xs text-gray-500'>{a.email}</p>
                </td>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <img className='w-8 h-8 rounded-full object-cover bg-[#EAEFFF]' src={imageUrl(a.doctor?.photo)} alt='' />
                    <div>
                      <p className='text-gray-800'>{a.doctor?.name}</p>
                      <p className='text-xs text-gray-500'>{a.doctor?.specialty}</p>
                    </div>
                  </div>
                </td>
                <td className='px-4 py-3 whitespace-nowrap'>{formatDate(a.date)}<br /><span className='text-gray-500'>{formatTime(a.time)}</span></td>
                <td className='px-4 py-3'>{currency}{a.fees}</td>
                <td className='px-4 py-3'><StatusBadge status={a.status} /></td>
                <td className='px-4 py-3'><AppointmentActions appointment={a} onChanged={loadAppointments} /></td>
              </tr>
            ))}
            {result.appointments.length === 0 && (
              <tr><td colSpan={6} className='px-4 py-6 text-center text-gray-500'>No appointments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={result.page} pages={result.pages} onChange={(page) => setFilters({ ...filters, page })} />
    </div>
  )
}

export default Appointments
