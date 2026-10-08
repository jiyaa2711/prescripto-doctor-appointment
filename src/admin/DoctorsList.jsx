import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import api, { errorMessage, imageUrl } from '../api/client'
import useSpecialties from '../hooks/useSpecialties'
import { currency } from '../utils/format'

const DoctorsList = () => {
  const specialties = useSpecialties()
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', specialty: '', status: '' })

  const loadDoctors = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/doctors', { params: filters })
      setDoctors(data.doctors)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [filters])

  // small delay so we don't call the API on every key press while typing a search
  useEffect(() => {
    const timer = setTimeout(loadDoctors, 300)
    return () => clearTimeout(timer)
  }, [loadDoctors])

  const toggleActive = async (doctor) => {
    try {
      await api.patch(`/doctors/${doctor._id}/status`, { isActive: !doctor.isActive })
      toast.success(`${doctor.name} ${doctor.isActive ? 'deactivated' : 'activated'}`)
      loadDoctors()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const deleteDoctor = async (doctor) => {
    if (!window.confirm(`Delete ${doctor.name}? This cannot be undone.`)) return
    try {
      await api.delete(`/doctors/${doctor._id}`)
      toast.success('Doctor deleted')
      loadDoctors()
    } catch (error) {
      toast.error(errorMessage(error)) // e.g. "has appointment history - deactivate instead"
    }
  }

  const setFilter = (key) => (e) => setFilters({ ...filters, [key]: e.target.value })

  return (
    <div>
      <div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
        <h1 className='text-xl font-medium text-gray-700'>All Doctors</h1>
        <Link to='/admin/doctors/new' className='bg-primary text-white text-sm px-6 py-2 rounded-full'>+ Add Doctor</Link>
      </div>

      <div className='flex flex-wrap gap-2 mb-5 text-sm'>
        <input value={filters.search} onChange={setFilter('search')} placeholder='Search name or email' className='border rounded px-3 py-2 bg-white flex-1 min-w-48' />
        <select value={filters.specialty} onChange={setFilter('specialty')} className='border rounded px-3 py-2 bg-white'>
          <option value=''>All specialties</option>
          {specialties.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
        </select>
        <select value={filters.status} onChange={setFilter('status')} className='border rounded px-3 py-2 bg-white'>
          <option value=''>Active & inactive</option>
          <option value='active'>Active only</option>
          <option value='inactive'>Inactive only</option>
        </select>
      </div>

      {loading && <p className='text-gray-500'>Loading...</p>}
      {!loading && doctors.length === 0 && <p className='text-gray-500'>No doctors match these filters.</p>}

      <div className='grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4'>
        {doctors.map((doctor) => (
          <div key={doctor._id} className={`border border-[#C9D8FF] rounded-xl overflow-hidden bg-white ${doctor.isActive ? '' : 'opacity-60'}`}>
            <img className='w-full h-48 object-cover object-top bg-[#EAEFFF]' src={imageUrl(doctor.photo)} alt={doctor.name} />
            <div className='p-4 space-y-1'>
              <p className='text-neutral-800 text-lg font-medium'>{doctor.name}</p>
              <p className='text-zinc-600 text-sm'>{doctor.specialty} · {doctor.experience} yrs · {currency}{doctor.fees}</p>
              <p className='text-xs text-gray-500 truncate'>{doctor.email || 'No email'}</p>
              <label className='flex items-center gap-2 text-sm pt-1 cursor-pointer'>
                <input type='checkbox' checked={doctor.isActive} onChange={() => toggleActive(doctor)} />
                {doctor.isActive ? 'Active' : 'Inactive'}
              </label>
              <div className='flex gap-2 pt-2'>
                <Link to={`/admin/doctors/${doctor._id}/edit`} className='flex-1 text-center text-sm border border-primary text-primary rounded py-1'>Edit</Link>
                <button onClick={() => deleteDoctor(doctor)} className='flex-1 text-sm border border-red-300 text-red-600 rounded py-1'>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DoctorsList
