import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api, { errorMessage, imageUrl } from '../api/client';
import { assets } from '../assets/assets';
import { useApp } from '../context/AppContext';

const MyProfile = () => {
  const { setUser } = useApp()
  const [profile, setProfile] = useState(null)
  const [saved, setSaved] = useState(null) // restored on Cancel
  const [isEdit, setIsEdit] = useState(false)
  const [image, setImage] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/users/profile')
      .then(({ data }) => { setProfile(data.user); setSaved(data.user) })
      .catch((error) => toast.error(errorMessage(error)))
  }, [])

  const save = async () => {
    // multipart because of the optional profile image
    const body = new FormData()
    body.append('name', profile.name)
    body.append('phone', profile.phone || '')
    body.append('gender', profile.gender)
    body.append('dob', profile.dob || '')
    body.append('address', JSON.stringify(profile.address || {}))
    if (image) body.append('image', image)

    setSaving(true)
    try {
      const { data } = await api.put('/users/profile', body)
      setProfile(data.user)
      setSaved(data.user)
      setUser((u) => ({ ...u, name: data.user.name, image: data.user.image })) // update navbar
      setImage(null)
      setIsEdit(false)
      toast.success('Profile updated')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return <p className='text-gray-500 py-10'>Loading...</p>

  const set = (key) => (e) => setProfile({ ...profile, [key]: e.target.value })
  const setAddress = (key) => (e) => setProfile({ ...profile, address: { ...profile.address, [key]: e.target.value } })
  const photo = image ? URL.createObjectURL(image) : profile.image ? imageUrl(profile.image) : assets.profile_pic

  return (
    <div className='max-w-lg flex flex-col gap-2 text-sm pt-5'>
      {isEdit ? (
        <label htmlFor='profile-image' className='inline-block relative cursor-pointer w-36'>
          <img className='w-36 h-36 object-cover rounded opacity-75' src={photo} alt='' />
          <img className='w-10 absolute bottom-12 right-12' src={assets.upload_icon} alt='Upload' />
          <input onChange={(e) => setImage(e.target.files[0])} type='file' id='profile-image' accept='image/png,image/jpeg,image/webp' hidden />
        </label>
      ) : (
        <img className='w-36 h-36 object-cover rounded' src={photo} alt='' />
      )}

      {isEdit
        ? <input className='bg-gray-50 text-3xl font-medium max-w-60 border rounded px-2' type='text' value={profile.name} onChange={set('name')} maxLength={100} />
        : <p className='font-medium text-3xl text-[#262626] mt-4'>{profile.name}</p>}

      <hr className='bg-[#ADADAD] h-[1px] border-none' />

      <div>
        <p className='text-gray-600 underline mt-3'>CONTACT INFORMATION</p>
        <div className='grid grid-cols-[1fr_3fr] gap-y-2.5 mt-3 text-[#363636]'>
          <p className='font-medium'>Email id:</p>
          <p className='text-primary break-all'>{profile.email}</p>
          <p className='font-medium'>Phone:</p>
          {isEdit
            ? <input className='bg-gray-50 max-w-52 border rounded px-2' type='tel' value={profile.phone || ''} onChange={set('phone')} maxLength={20} />
            : <p className='text-primary'>{profile.phone || '–'}</p>}
          <p className='font-medium'>Address:</p>
          {isEdit ? (
            <p>
              <input className='bg-gray-50 w-full border rounded px-2 mb-1' type='text' value={profile.address?.line1 || ''} onChange={setAddress('line1')} />
              <input className='bg-gray-50 w-full border rounded px-2' type='text' value={profile.address?.line2 || ''} onChange={setAddress('line2')} />
            </p>
          ) : (
            <p className='text-gray-500'>{profile.address?.line1 || '–'}<br />{profile.address?.line2}</p>
          )}
        </div>
      </div>

      <div>
        <p className='text-[#797979] underline mt-3'>BASIC INFORMATION</p>
        <div className='grid grid-cols-[1fr_3fr] gap-y-2.5 mt-3 text-gray-600'>
          <p className='font-medium'>Gender:</p>
          {isEdit ? (
            <select className='max-w-28 bg-gray-50 border rounded' value={profile.gender} onChange={set('gender')}>
              <option value='Not Selected'>Not Selected</option>
              <option value='Male'>Male</option>
              <option value='Female'>Female</option>
              <option value='Other'>Other</option>
            </select>
          ) : <p className='text-gray-500'>{profile.gender}</p>}
          <p className='font-medium'>Birthday:</p>
          {isEdit
            ? <input className='max-w-36 bg-gray-50 border rounded px-1' type='date' value={profile.dob || ''} onChange={set('dob')} max={new Date().toISOString().slice(0, 10)} />
            : <p className='text-gray-500'>{profile.dob || '–'}</p>}
        </div>
      </div>

      <div className='mt-10 flex gap-3'>
        {isEdit ? (
          <>
            <button onClick={save} disabled={saving} className='border border-primary px-8 py-2 rounded-full bg-primary text-white disabled:opacity-60'>{saving ? 'Saving...' : 'Save information'}</button>
            <button onClick={() => { setProfile(saved); setImage(null); setIsEdit(false) }} className='border px-8 py-2 rounded-full'>Cancel</button>
          </>
        ) : (
          <button onClick={() => setIsEdit(true)} className='border border-primary px-8 py-2 rounded-full hover:bg-primary hover:text-white transition-all'>Edit</button>
        )}
      </div>
    </div>
  );
}

export default MyProfile;
