import { useNavigate } from 'react-router-dom'
import { imageUrl } from '../api/client'
import { currency } from '../utils/format'

// Doctor card used on Home, All Doctors, Related Doctors and the AI Doctor Finder.
// showActions = true adds "View Doctor" / "Book Appointment" buttons (AI finder results).
// Both lead to the existing booking page - there is no separate booking flow.
const DoctorCard = ({ doctor, showActions = false }) => {
  const navigate = useNavigate()
  const open = (hash = '') => {
    navigate(`/appointment/${doctor._id}${hash}`)
    if (!hash) window.scrollTo(0, 0)
  }

  return (
    <div
      onClick={showActions ? undefined : () => open()}
      className={`border border-[#C9D8FF] rounded-xl overflow-hidden bg-white flex flex-col ${showActions ? '' : 'cursor-pointer hover:-translate-y-2 transition-all duration-500'}`}
    >
      <img className='bg-[#EAEFFF] w-full aspect-[4/4] object-cover object-top' src={imageUrl(doctor.photo)} alt={doctor.name} loading='lazy' />
      <div className='p-4 flex flex-col flex-1'>
        <div className={`flex items-center gap-2 text-sm ${doctor.available ? 'text-green-500' : 'text-gray-500'}`}>
          <span className={`w-2 h-2 rounded-full ${doctor.available ? 'bg-green-500' : 'bg-gray-500'}`}></span>
          <p>{doctor.available ? 'Available' : 'Not Available'}</p>
        </div>
        <p className='text-[#262626] text-lg font-medium'>{doctor.name}</p>
        <p className='text-[#5C5C5C] text-sm'>{doctor.specialty}</p>

        {showActions && (
          <>
            <div className='text-xs text-gray-500 mt-2 space-y-0.5'>
              <p>{doctor.experience} years experience · Fee {currency}{doctor.fees}</p>
              {doctor.address?.line1 && <p className='truncate'>{doctor.address.line1}, {doctor.address.line2}</p>}
            </div>
            <div className='flex flex-wrap gap-2 mt-auto pt-3'>
              <button onClick={() => open()} className='flex-1 whitespace-nowrap text-sm border border-primary text-primary rounded-full px-3 py-1.5 hover:bg-[#F2F3FF]'>View Doctor</button>
              <button onClick={() => open('#booking')} disabled={!doctor.available} className='flex-1 whitespace-nowrap text-sm bg-primary text-white rounded-full px-3 py-1.5 disabled:opacity-50'>Book Appointment</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DoctorCard
