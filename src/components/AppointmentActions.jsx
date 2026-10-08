import { toast } from 'react-toastify'
import api, { errorMessage } from '../api/client'
import { toDateString } from '../utils/format'

// An appointment can only be marked completed once its start time has passed
const hasStarted = ({ date, time }) => {
  const now = new Date()
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const today = toDateString(now)
  return date < today || (date === today && time <= nowTime)
}

// Same transition rules as the backend (backend/constants/appointment.js).
// The backend re-checks everything; this only decides which buttons to show.
const NEXT_STATUS = {
  booked: ['confirmed', 'completed'],
  confirmed: ['completed'],
  completed: [],
  cancelled: [],
}

const LABELS = { confirmed: 'Confirm', completed: 'Mark completed' }

// Buttons to change an appointment's status - used by the admin and doctor panels
const AppointmentActions = ({ appointment, onChanged }) => {
  const changeStatus = async (status) => {
    try {
      await api.patch(`/appointments/${appointment._id}/status`, { status })
      toast.success(`Appointment ${status}`)
      onChanged()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const cancel = async () => {
    if (!window.confirm('Cancel this appointment?')) return
    try {
      await api.patch(`/appointments/${appointment._id}/cancel`)
      toast.success('Appointment cancelled')
      onChanged()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const next = (NEXT_STATUS[appointment.status] || [])
    .filter((status) => status !== 'completed' || hasStarted(appointment))
  if (next.length === 0 && ['completed', 'cancelled'].includes(appointment.status)) return <span className='text-gray-400 text-xs'>–</span>

  return (
    <div className='flex flex-wrap gap-1.5'>
      {next.map((status) => (
        <button key={status} onClick={() => changeStatus(status)}
          className={`text-xs px-2.5 py-1 rounded border ${status === 'completed' ? 'border-green-400 text-green-700' : 'border-primary text-primary'}`}>
          {LABELS[status]}
        </button>
      ))}
      <button onClick={cancel} className='text-xs px-2.5 py-1 rounded border border-red-300 text-red-600'>Cancel</button>
    </div>
  )
}

export default AppointmentActions
