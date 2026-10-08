import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import api, { errorMessage, imageUrl } from '../api/client'
import { WEEKDAYS, currency } from '../utils/format'

// A doctor can edit their practical details. Name and specialty are managed by the admin.
const DoctorProfile = () => {
  const [doctor, setDoctor] = useState(null)
  const [saved, setSaved] = useState(null) // last saved version, restored on "Cancel"
  const [isEdit, setIsEdit] = useState(false)

  useEffect(() => {
    api.get('/doctors/me/profile')
      .then(({ data }) => { setDoctor(data.doctor); setSaved(data.doctor) })
      .catch((error) => toast.error(errorMessage(error)))
  }, [])

  const save = async () => {
    try {
      const { fees, about, phone, available, workingDays, startTime, endTime, address, languages } = doctor
      const { data } = await api.put('/doctors/me/profile', { fees, about, phone, available, workingDays, startTime, endTime, address, languages })
      setDoctor(data.doctor)
      setSaved(data.doctor)
      setIsEdit(false)
      toast.success('Profile updated')
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  if (!doctor) return <p className='text-gray-500'>Loading...</p>

  const set = (key) => (e) => setDoctor({ ...doctor, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const toggleDay = (day) => setDoctor({
    ...doctor,
    workingDays: doctor.workingDays.includes(day) ? doctor.workingDays.filter((d) => d !== day) : [...doctor.workingDays, day].sort(),
  })
  const input = 'border rounded px-2 py-1'

  return (
    <div className='flex flex-col md:flex-row gap-4'>
      <img className='bg-primary/80 w-full sm:max-w-64 rounded-lg object-cover' src={imageUrl(doctor.photo)} alt={doctor.name} />

      <div className='flex-1 border border-stone-100 rounded-lg p-6 sm:p-8 bg-white text-sm text-gray-600 space-y-3'>
        <p className='text-3xl font-medium text-gray-700'>{doctor.name}</p>
        <p>{doctor.degree} - {doctor.specialty} <span className='py-0.5 px-2 border text-xs rounded-full'>{doctor.experience} Years</span></p>

        <div>
          <p className='font-medium text-neutral-800'>About:</p>
          {isEdit
            ? <textarea className='w-full border rounded p-2 mt-1' rows={5} value={doctor.about} onChange={set('about')} maxLength={2000} />
            : <p className='max-w-[700px] mt-1'>{doctor.about}</p>}
        </div>

        <p>Appointment fee: <span className='text-gray-800'>{currency} {isEdit ? <input className={`${input} w-24`} type='number' min={0} value={doctor.fees} onChange={set('fees')} /> : doctor.fees}</span></p>

        <p>Phone: {isEdit ? <input className={input} value={doctor.phone || ''} onChange={set('phone')} /> : (doctor.phone || '–')}</p>

        <div>
          <p>Address:</p>
          {isEdit ? (
            <div className='flex flex-col gap-1 max-w-sm'>
              <input className={input} value={doctor.address?.line1 || ''} onChange={(e) => setDoctor({ ...doctor, address: { ...doctor.address, line1: e.target.value } })} />
              <input className={input} value={doctor.address?.line2 || ''} onChange={(e) => setDoctor({ ...doctor, address: { ...doctor.address, line2: e.target.value } })} />
            </div>
          ) : <p>{doctor.address?.line1}<br />{doctor.address?.line2}</p>}
        </div>

        <div>
          <p>Working days & hours:</p>
          <div className='flex flex-wrap gap-1.5 mt-1'>
            {WEEKDAYS.map((label, day) => (
              <button type='button' key={label} disabled={!isEdit} onClick={() => toggleDay(day)}
                className={`px-2.5 py-1 rounded-full border text-xs ${doctor.workingDays.includes(day) ? 'bg-primary text-white border-primary' : 'bg-white'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className='flex items-center gap-2 mt-2'>
            {isEdit ? (
              <>
                <input className={input} type='time' value={doctor.startTime} onChange={set('startTime')} /> to
                <input className={input} type='time' value={doctor.endTime} onChange={set('endTime')} />
              </>
            ) : <p>{doctor.startTime} – {doctor.endTime}</p>}
          </div>
        </div>

        <label className='flex items-center gap-2'>
          <input type='checkbox' disabled={!isEdit} checked={doctor.available} onChange={set('available')} />
          Accepting new appointments
        </label>

        {isEdit
          ? <div className='flex gap-2'>
              <button onClick={save} className='px-6 py-1.5 bg-primary text-white rounded-full'>Save</button>
              <button onClick={() => { setDoctor(saved); setIsEdit(false) }} className='px-6 py-1.5 border rounded-full'>Cancel</button>
            </div>
          : <button onClick={() => setIsEdit(true)} className='px-6 py-1.5 border border-primary text-sm rounded-full hover:bg-primary hover:text-white transition-all'>Edit</button>}
      </div>
    </div>
  )
}

export default DoctorProfile
