import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import api, { errorMessage, imageUrl } from '../api/client'
import { assets } from '../assets/assets'
import useSpecialties from '../hooks/useSpecialties'
import { WEEKDAYS } from '../utils/format'

const EMPTY = {
  name: '', email: '', accountPassword: '', phone: '', specialty: '', degree: 'MBBS',
  experience: 1, fees: '', gender: 'Male', languages: 'English', line1: '', line2: '', about: '',
  workingDays: [1, 2, 3, 4, 5, 6], startTime: '10:00', endTime: '18:00', available: true,
}

// Used for both "Add Doctor" (/admin/doctors/new) and "Edit Doctor" (/admin/doctors/:id/edit)
const DoctorForm = () => {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const specialties = useSpecialties()

  const [form, setForm] = useState(EMPTY)
  const [image, setImage] = useState(null)
  const [currentPhoto, setCurrentPhoto] = useState('')
  const [saving, setSaving] = useState(false)

  // Edit mode: load the doctor into the form
  useEffect(() => {
    if (!isEdit) return
    api.get(`/admin/doctors/${id}`)
      .then(({ data }) => {
        const d = data.doctor
        setForm({
          ...EMPTY,
          ...d,
          email: d.email || '',
          phone: d.phone || '',
          languages: (d.languages || []).join(', '),
          line1: d.address?.line1 || '',
          line2: d.address?.line2 || '',
        })
        setCurrentPhoto(d.photo)
      })
      .catch((error) => {
        toast.error(errorMessage(error))
        navigate('/admin/doctors')
      })
  }, [id, isEdit, navigate])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const toggleDay = (day) =>
    setForm({ ...form, workingDays: form.workingDays.includes(day) ? form.workingDays.filter((d) => d !== day) : [...form.workingDays, day] })

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.specialty) return toast.error('Please select a specialty')
    if (form.workingDays.length === 0) return toast.error('Select at least one working day')

    // multipart/form-data because of the optional image file
    const body = new FormData()
    const fields = ['name', 'email', 'phone', 'specialty', 'degree', 'experience', 'fees', 'gender', 'languages', 'about', 'startTime', 'endTime', 'available']
    fields.forEach((key) => body.append(key, form[key]))
    body.append('workingDays', form.workingDays.join(','))
    body.append('address', JSON.stringify({ line1: form.line1, line2: form.line2 }))
    if (!isEdit && form.accountPassword) body.append('accountPassword', form.accountPassword)
    if (image) body.append('image', image)

    setSaving(true)
    try {
      if (isEdit) await api.put(`/doctors/${id}`, body)
      else await api.post('/doctors', body)
      toast.success(isEdit ? 'Doctor updated' : 'Doctor added')
      navigate('/admin/doctors')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const input = 'border rounded px-3 py-2 w-full'
  const preview = image ? URL.createObjectURL(image) : currentPhoto ? imageUrl(currentPhoto) : assets.upload_area

  return (
    <form onSubmit={onSubmit} className='w-full'>
      <h1 className='mb-3 text-xl font-medium text-gray-700'>{isEdit ? 'Edit Doctor' : 'Add Doctor'}</h1>

      <div className='bg-white px-4 sm:px-8 py-8 border rounded w-full max-w-4xl'>
        <div className='flex items-center gap-4 mb-8 text-gray-500'>
          <label htmlFor='doc-img' className='cursor-pointer'>
            <img className='w-16 h-16 object-cover bg-gray-100 rounded-full' src={preview} alt='' />
          </label>
          <input onChange={(e) => setImage(e.target.files[0])} type='file' id='doc-img' accept='image/png,image/jpeg,image/webp' hidden />
          <p>Upload doctor <br /> picture (max 2 MB)</p>
        </div>

        <div className='flex flex-col lg:flex-row items-start gap-6 lg:gap-10 text-gray-600 text-sm'>
          <div className='w-full lg:flex-1 flex flex-col gap-4'>
            <div><p>Doctor name *</p><input className={input} value={form.name} onChange={set('name')} required maxLength={100} placeholder='Dr. Jane Doe' /></div>
            <div><p>Email {isEdit ? '' : '(needed for a login account)'}</p><input className={input} type='email' value={form.email} onChange={set('email')} placeholder='jane@example.com' /></div>
            {!isEdit && (
              <div>
                <p>Login password (optional)</p>
                <input className={input} type='password' value={form.accountPassword} onChange={set('accountPassword')} minLength={8} placeholder='Leave empty for no doctor login' autoComplete='new-password' />
              </div>
            )}
            <div><p>Phone</p><input className={input} value={form.phone} onChange={set('phone')} maxLength={20} /></div>
            <div className='flex gap-3'>
              <div className='flex-1'><p>Experience (years)</p><input className={input} type='number' min={0} max={70} value={form.experience} onChange={set('experience')} /></div>
              <div className='flex-1'><p>Fees *</p><input className={input} type='number' min={0} value={form.fees} onChange={set('fees')} required /></div>
            </div>
            <div><p>Languages (comma separated)</p><input className={input} value={form.languages} onChange={set('languages')} /></div>
          </div>

          <div className='w-full lg:flex-1 flex flex-col gap-4'>
            <div>
              <p>Specialty *</p>
              <select className={input} value={form.specialty} onChange={set('specialty')} required>
                <option value=''>Select specialty</option>
                {specialties.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className='flex gap-3'>
              <div className='flex-1'><p>Degree</p><input className={input} value={form.degree} onChange={set('degree')} /></div>
              <div className='flex-1'>
                <p>Gender</p>
                <select className={input} value={form.gender} onChange={set('gender')}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
            </div>
            <div>
              <p>Address</p>
              <input className={`${input} mb-2`} value={form.line1} onChange={set('line1')} placeholder='Address line 1' />
              <input className={input} value={form.line2} onChange={set('line2')} placeholder='Address line 2' />
            </div>
            <div>
              <p>Working days</p>
              <div className='flex flex-wrap gap-1.5 mt-1'>
                {WEEKDAYS.map((label, day) => (
                  <button type='button' key={label} onClick={() => toggleDay(day)}
                    className={`px-2.5 py-1 rounded-full border text-xs ${form.workingDays.includes(day) ? 'bg-primary text-white border-primary' : 'bg-white'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className='flex gap-3'>
              <div className='flex-1'><p>Start time</p><input className={input} type='time' value={form.startTime} onChange={set('startTime')} /></div>
              <div className='flex-1'><p>End time</p><input className={input} type='time' value={form.endTime} onChange={set('endTime')} /></div>
            </div>
            <label className='flex items-center gap-2 cursor-pointer'>
              <input type='checkbox' checked={form.available} onChange={set('available')} /> Accepting new appointments
            </label>
          </div>
        </div>

        <div className='text-sm text-gray-600'>
          <p className='mt-4 mb-2'>About doctor</p>
          <textarea className='w-full px-4 pt-2 border rounded' rows={4} value={form.about} onChange={set('about')} maxLength={2000} placeholder='Short description shown to patients' />
        </div>

        <div className='flex gap-3 mt-4'>
          <button type='submit' disabled={saving} className='bg-primary px-10 py-3 text-white rounded-full disabled:opacity-60'>
            {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add doctor'}
          </button>
          <button type='button' onClick={() => navigate('/admin/doctors')} className='px-8 py-3 border rounded-full'>Cancel</button>
        </div>
      </div>
    </form>
  )
}

export default DoctorForm
