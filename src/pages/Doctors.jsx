import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import { specialityData } from '../assets/assets';
import DoctorCard from '../components/DoctorCard';

// /doctors            -> all doctors
// /doctors/:speciality -> filtered by specialty (search + filtering is done by the backend)
const Doctors = () => {
  const { speciality } = useParams()
  const navigate = useNavigate()
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [showFilter, setShowFilter] = useState(false)

  useEffect(() => {
    const params = { specialty: speciality, search: search || undefined, available: onlyAvailable ? 'true' : undefined }
    const timer = setTimeout(() => {
      api.get('/doctors', { params })
        .then(({ data }) => { setDoctors(data.doctors); setError('') })
        .catch((err) => setError(errorMessage(err)))
        .finally(() => setLoading(false))
    }, 250) // wait until the user stops typing
    return () => clearTimeout(timer)
  }, [speciality, search, onlyAvailable])

  const toggleSpeciality = (name) => navigate(speciality === name ? '/doctors' : `/doctors/${name}`)

  return (
    <div>
      <p className='text-gray-600'>Browse through the doctors specialist.</p>
      <div className='flex flex-col sm:flex-row items-start gap-5 mt-5'>
        <button onClick={() => setShowFilter(!showFilter)} className={`py-1 px-3 border rounded text-sm transition-all sm:hidden ${showFilter ? 'bg-primary text-white' : ''}`}>Filters</button>

        <div className={`flex-col gap-4 text-sm text-gray-600 ${showFilter ? 'flex' : 'hidden sm:flex'}`}>
          {specialityData.map((item) => (
            <p key={item.speciality} onClick={() => toggleSpeciality(item.speciality)}
              className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === item.speciality ? 'bg-[#E2E5FF] text-black' : ''}`}>
              {item.speciality}
            </p>
          ))}
        </div>

        <div className='w-full'>
          <div className='flex flex-wrap items-center gap-3 mb-4 text-sm'>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Search doctor by name'
              className='border border-gray-300 rounded px-3 py-2 flex-1 min-w-48' aria-label='Search doctors' />
            <label className='flex items-center gap-2 text-gray-600 cursor-pointer'>
              <input type='checkbox' checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
              Available only
            </label>
          </div>

          {error && <p className='text-red-600 text-sm'>{error}</p>}
          {loading && <p className='text-gray-500 text-sm'>Loading doctors...</p>}
          {!loading && !error && doctors.length === 0 && (
            <p className='text-gray-500 text-sm'>No doctors found. <Link to='/doctors' className='text-primary underline'>Show all doctors</Link></p>
          )}
          <div className='w-full grid grid-cols-auto gap-4 gap-y-6'>
            {doctors.map((doctor) => <DoctorCard key={doctor._id} doctor={doctor} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Doctors;
