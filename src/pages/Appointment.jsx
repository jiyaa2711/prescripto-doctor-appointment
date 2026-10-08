import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { errorMessage, imageUrl } from '../api/client';
import { assets } from '../assets/assets';
import { useApp } from '../context/AppContext';
import DoctorCard from '../components/DoctorCard';
import { WEEKDAYS, currency, formatTime, toDateString } from '../utils/format';

const DAYS_TO_SHOW = 7

// The ONE booking flow of the app: doctor details + slot picker.
// Normal browsing, the specialty menu and the AI Doctor Finder all lead here.
const Appointment = () => {
  const { docId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useApp()
  const bookingRef = useRef(null)

  const [doctor, setDoctor] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [related, setRelated] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(true)
  const [slotsVersion, setSlotsVersion] = useState(0) // bump to reload the same day's slots
  const [selectedTime, setSelectedTime] = useState('')
  const [reason, setReason] = useState('')
  const [booking, setBooking] = useState(false)

  // The next 7 days, marking the ones the doctor works on
  const days = Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i)
    return { value: toDateString(date), weekday: WEEKDAYS[date.getDay()], day: date.getDate(), works: doctor?.workingDays.includes(date.getDay()) }
  })

  // Load the doctor (+ related doctors of the same specialty)
  useEffect(() => {
    api.get(`/doctors/${docId}`)
      .then(({ data }) => {
        setDoctor(data.doctor)
        setNotFound(false)
        setSelectedTime('')
        // pre-select the first day the doctor works
        const first = Array.from({ length: DAYS_TO_SHOW }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d })
          .find((d) => data.doctor.workingDays.includes(d.getDay()))
        setSelectedDate(first ? toDateString(first) : '')
        return api.get('/doctors', { params: { specialty: data.doctor.specialty } })
      })
      .then((res) => res && setRelated(res.data.doctors.filter((d) => d._id !== docId)))
      .catch(() => setNotFound(true))
  }, [docId])

  // Load free/booked slots whenever the selected day changes
  useEffect(() => {
    if (!selectedDate) return
    let cancelled = false
    api.get(`/doctors/${docId}/slots`, { params: { date: selectedDate } })
      .then(({ data }) => { if (!cancelled) setSlots(data.slots) })
      .catch(() => { if (!cancelled) setSlots([]) })
      .finally(() => { if (!cancelled) setSlotsLoading(false) })
    return () => { cancelled = true }
  }, [docId, selectedDate, slotsVersion])

  // Coming from "Book Appointment" (e.g. AI finder) -> scroll to the slot picker
  useEffect(() => {
    if (doctor && location.hash === '#booking') bookingRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [doctor, location.hash])

  const chooseDate = (value) => {
    setSelectedDate(value)
    setSelectedTime('')
    setSlotsLoading(true)
  }

  const bookAppointment = async () => {
    if (!user) {
      toast.info('Please log in to book an appointment')
      return navigate('/login', { state: { from: location.pathname } })
    }
    if (user.role !== 'patient') return toast.error('Only patient accounts can book appointments')
    if (!selectedTime) return toast.error('Please select a time slot')

    setBooking(true)
    try {
      await api.post('/appointments', { doctorId: docId, date: selectedDate, time: selectedTime, reason })
      toast.success('Appointment booked')
      navigate('/my-appointment')
      window.scrollTo(0, 0)
    } catch (error) {
      toast.error(errorMessage(error)) // e.g. "This time slot has just been booked"
      // reload slots so a slot someone else just took shows as booked
      setSelectedTime('')
      setSlotsLoading(true)
      setSlotsVersion((v) => v + 1)
    } finally {
      setBooking(false)
    }
  }

  // no working day in the next week -> nothing to load
  const loadingSlots = slotsLoading && Boolean(selectedDate)

  if (notFound) return <p className='text-gray-600 py-20 text-center'>Doctor not found.</p>
  if (!doctor) return <p className='text-gray-500 py-20 text-center'>Loading...</p>

  return (
    <div>
      {/* ---------- Doctor details ---------- */}
      <div className='flex flex-col sm:flex-row gap-4'>
        <div>
          <img className='bg-primary w-full sm:max-w-72 rounded-lg' src={imageUrl(doctor.photo)} alt={doctor.name} />
        </div>
        <div className='flex-1 border border-[#ADADAD] rounded-lg p-8 py-7 bg-white mx-2 sm:mx-0 mt-[-80px] sm:mt-0'>
          <p className='flex items-center gap-2 text-3xl font-medium text-gray-700'>
            {doctor.name} <img className='w-5' src={assets.verified_icon} alt='Verified' />
          </p>
          <div className='flex flex-wrap items-center gap-2 mt-1 text-gray-600'>
            <p>{doctor.degree} - {doctor.specialty}</p>
            <span className='py-0.5 px-2 border text-xs rounded-full'>{doctor.experience} Years</span>
          </div>
          <div>
            <p className='flex items-center gap-1 text-sm font-medium text-[#262626] mt-3'>About <img className='w-3' src={assets.info_icon} alt='' /></p>
            <p className='text-sm text-gray-600 max-w-[700px] mt-1'>{doctor.about}</p>
          </div>
          <p className='text-sm text-gray-600 mt-3'>Languages: {doctor.languages.join(', ')}</p>
          <p className='text-sm text-gray-600 mt-1'>Location: {doctor.address?.line1}, {doctor.address?.line2}</p>
          <p className='text-gray-600 font-medium mt-4'>
            Appointment fee: <span className='text-gray-800'>{currency}{doctor.fees}</span>
          </p>
        </div>
      </div>

      {/* ---------- Booking slots ---------- */}
      <div id='booking' ref={bookingRef} className='sm:ml-72 sm:pl-4 mt-8 font-medium text-[#565656] scroll-mt-6'>
        <p>Booking slots</p>
        {!doctor.available ? (
          <p className='mt-4 text-sm font-normal text-gray-500'>This doctor is not accepting new appointments right now.</p>
        ) : (
          <>
            <div className='flex gap-3 items-center w-full overflow-x-auto mt-4 pb-2'>
              {days.map((d) => (
                <button key={d.value} disabled={!d.works} onClick={() => chooseDate(d.value)}
                  className={`text-center py-6 min-w-16 rounded-full flex-shrink-0 ${selectedDate === d.value ? 'bg-primary text-white' : 'border border-[#DDDDDD]'} disabled:opacity-40 disabled:cursor-not-allowed`}
                  title={d.works ? '' : 'Doctor does not work on this day'}>
                  <p>{d.weekday}</p>
                  <p>{d.day}</p>
                </button>
              ))}
            </div>

            <div className='flex items-center gap-3 w-full overflow-x-auto mt-4 pb-2'>
              {loadingSlots && <p className='text-sm font-light text-gray-500'>Loading slots...</p>}
              {!loadingSlots && slots.length === 0 && <p className='text-sm font-light text-gray-500'>No slots left on this day. Please choose another day.</p>}
              {!loadingSlots && slots.map((slot) => (
                <button key={slot.time} disabled={slot.isBooked} onClick={() => setSelectedTime(slot.time)}
                  className={`text-sm font-light flex-shrink-0 px-5 py-2 rounded-full ${slot.time === selectedTime ? 'bg-primary text-white' : 'text-[#949494] border border-[#B4B4B4]'} disabled:line-through disabled:opacity-40 disabled:cursor-not-allowed`}
                  title={slot.isBooked ? 'Already booked' : ''}>
                  {formatTime(slot.time)}
                </button>
              ))}
            </div>

            <textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 500))} rows={2}
              placeholder='Reason for visit (optional)'
              className='mt-4 w-full max-w-xl border border-[#B4B4B4] rounded-lg p-3 text-sm font-normal' />

            <button onClick={bookAppointment} disabled={booking}
              className='block bg-primary text-white text-sm font-light px-20 py-3 rounded-full my-6 disabled:opacity-60'>
              {booking ? 'Booking...' : 'Book an appointment'}
            </button>
          </>
        )}
      </div>

      {/* ---------- Related doctors ---------- */}
      {related.length > 0 && (
        <div className='flex flex-col items-center gap-4 my-16 text-[#262626]'>
          <h1 className='text-3xl font-medium'>Related Doctors</h1>
          <p className='sm:w-1/3 text-center text-sm'>Other {doctor.specialty}s you can book.</p>
          <div className='w-full grid grid-cols-auto gap-4 pt-5 gap-y-6'>
            {related.slice(0, 5).map((d) => <DoctorCard key={d._id} doctor={d} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointment;
