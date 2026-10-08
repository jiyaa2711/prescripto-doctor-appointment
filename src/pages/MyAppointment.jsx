import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { errorMessage, imageUrl } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { currency, formatDate, formatTime, toDateString } from '../utils/format';

const MyAppointment = () => {
  const [appointments, setAppointments] = useState(null)

  const load = useCallback(() => {
    api.get('/appointments')
      .then(({ data }) => setAppointments(data.appointments))
      .catch((error) => { toast.error(errorMessage(error)); setAppointments([]) })
  }, [])

  useEffect(() => { load() }, [load])

  const cancelAppointment = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return
    try {
      await api.patch(`/appointments/${id}/cancel`)
      toast.success('Appointment cancelled')
      load()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  if (!appointments) return <p className='text-gray-500 py-10'>Loading...</p>

  const today = toDateString(new Date())
  const canCancel = (a) => ['booked', 'confirmed'].includes(a.status) && a.date >= today

  return (
    <div>
      <p className='pb-3 mt-12 text-lg font-medium text-gray-600 border-b'>My appointments</p>

      {appointments.length === 0 && (
        <p className='py-8 text-sm text-gray-500'>You have no appointments yet. <Link to='/doctors' className='text-primary underline'>Find a doctor</Link></p>
      )}

      {appointments.map((item) => (
        <div key={item._id} className='grid grid-cols-[1fr_2fr] gap-4 sm:flex sm:gap-6 py-4 border-b'>
          <div>
            <img className='w-36 bg-[#EAEFFF] rounded' src={imageUrl(item.doctor?.photo)} alt='' />
          </div>
          <div className='flex-1 text-sm text-[#5E5E5E]'>
            <p className='text-[#262626] text-base font-semibold'>{item.doctor?.name}</p>
            <p>{item.doctor?.specialty}</p>
            <p className='text-[#464646] font-medium mt-1'>Address:</p>
            <p>{item.doctor?.address?.line1}</p>
            <p>{item.doctor?.address?.line2}</p>
            <p className='mt-1'><span className='text-sm text-[#3C3C3C] font-medium'>Date & Time:</span> {formatDate(item.date)} | {formatTime(item.time)}</p>
            <p className='mt-1'><span className='text-sm text-[#3C3C3C] font-medium'>Fee:</span> {currency}{item.fees}</p>
            {item.reason && <p className='mt-1'><span className='text-sm text-[#3C3C3C] font-medium'>Reason:</span> {item.reason}</p>}
          </div>
          <div className='col-span-2 sm:col-span-1 flex flex-col gap-2 justify-end text-sm text-center'>
            <div className='sm:min-w-48 flex justify-center'><StatusBadge status={item.status} /></div>
            {canCancel(item) && (
              <button onClick={() => cancelAppointment(item._id)}
                className='text-[#696969] sm:min-w-48 py-2 border rounded hover:bg-red-600 hover:text-white transition-all duration-300'>
                Cancel appointment
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MyAppointment;
