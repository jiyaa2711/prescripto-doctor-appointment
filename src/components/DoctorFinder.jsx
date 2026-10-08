import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errorMessage } from '../api/client'
import DoctorCard from './DoctorCard'
import { specialityData } from '../assets/assets'

const MAX_LENGTH = 500
const EXAMPLES = [
  'I have acne and skin irritation',
  'I need a doctor for my child',
  'I have knee pain',
  'I have fever and weakness',
]

// AI Doctor/Department Finder.
// The patient describes their concern -> backend asks the AI for ONE supported specialty ->
// backend returns real doctors from the database -> we show them with the normal booking buttons.
const DoctorFinder = () => {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const findDoctor = async (e) => {
    e.preventDefault()
    if (message.trim().length < 3) return setError('Please describe your concern in a few words.')
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const { data } = await api.post('/ai/doctor-finder', { message })
      setResult(data)
    } catch (err) {
      setError(errorMessage(err)) // e.g. validation error or "Too many requests"
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id='doctor-finder' className='my-16 md:mx-10'>
      <div className='bg-[#F2F3FF] border border-[#C9D8FF] rounded-2xl p-5 sm:p-8'>
        <div className='text-center max-w-2xl mx-auto'>
          <p className='inline-block text-xs font-medium bg-white text-primary border border-primary/30 rounded-full px-3 py-1 mb-3'>AI-powered</p>
          <h2 className='text-2xl sm:text-3xl font-medium text-gray-800'>Find the Right Doctor</h2>
          <p className='text-sm text-gray-600 mt-2'>Describe your health concern in your own words and we'll suggest which type of doctor may be a good starting point.</p>
        </div>

        <form onSubmit={findDoctor} className='max-w-2xl mx-auto mt-6'>
          <label htmlFor='finder-message' className='sr-only'>Describe your health concern</label>
          <textarea
            id='finder-message'
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
            rows={3}
            placeholder='Example: I have skin irritation and acne...'
            className='w-full border border-zinc-300 rounded-xl p-4 text-sm bg-white focus:outline-none focus:border-primary resize-none'
          />
          <div className='flex flex-wrap items-center justify-between gap-2 mt-2'>
            <div className='flex flex-wrap gap-2'>
              {EXAMPLES.map((example) => (
                <button type='button' key={example} onClick={() => setMessage(example)}
                  className='text-xs bg-white border border-gray-300 rounded-full px-3 py-1 text-gray-600 hover:border-primary hover:text-primary'>
                  {example}
                </button>
              ))}
            </div>
            <span className='text-xs text-gray-400'>{message.length}/{MAX_LENGTH}</span>
          </div>
          <button type='submit' disabled={loading} className='mt-4 w-full sm:w-auto bg-primary text-white px-10 py-3 rounded-full disabled:opacity-60'>
            {loading ? 'Finding the right specialist...' : 'Find Doctor'}
          </button>
        </form>

        {/* Results (announced to screen readers) */}
        <div aria-live='polite' className='max-w-5xl mx-auto'>
          {error && <p className='mt-5 text-center text-sm text-red-600'>{error}</p>}

          {result && (
            <div className='mt-8 space-y-5'>
              {result.needsUrgentCare && (
                <div role='alert' className='bg-red-50 border border-red-300 text-red-800 rounded-xl p-4 text-sm'>
                  <p className='font-semibold mb-1'>⚠ Please seek urgent medical care</p>
                  <p>{result.urgentMessage}</p>
                </div>
              )}

              {!result.aiAvailable && (
                <div className='bg-white border rounded-xl p-5 text-sm text-gray-700'>
                  <p className='font-medium'>{result.message}</p>
                  <div className='flex flex-wrap gap-2 mt-3'>
                    {specialityData.map((s) => (
                      <Link key={s.speciality} to={`/doctors/${s.speciality}`} className='text-xs border rounded-full px-3 py-1 hover:border-primary hover:text-primary'>{s.speciality}</Link>
                    ))}
                  </div>
                </div>
              )}

              {result.aiAvailable && !result.specialty && (
                <p className='bg-white border rounded-xl p-5 text-sm text-gray-700'>{result.message}</p>
              )}

              {result.aiAvailable && result.specialty && (
                <>
                  <div className='bg-white border rounded-xl p-5'>
                    <p className='text-lg text-gray-800'>
                      Based on your description, you may want to consult a <span className='font-semibold text-primary'>{result.specialty}</span>.
                    </p>
                    <p className='text-sm text-gray-600 mt-1'>{result.reason}</p>
                    <p className='text-xs text-gray-500 mt-2'>
                      Match confidence: <span className='capitalize'>{result.confidence}</span>
                      {result.confidence === 'low' && ' – a general check-up is a sensible first step.'}
                    </p>
                  </div>

                  {result.doctors.length === 0 ? (
                    <p className='text-sm text-gray-600'>No {result.specialty}s are available right now. <Link className='text-primary underline' to='/doctors'>Browse all doctors</Link></p>
                  ) : (
                    <>
                      <div className='grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
                        {result.doctors.map((doctor) => <DoctorCard key={doctor._id} doctor={doctor} showActions />)}
                      </div>
                      <Link to={`/doctors/${result.specialty}`} className='inline-block text-sm text-primary underline'>See all {result.specialty}s</Link>
                    </>
                  )}
                </>
              )}

              <p className='text-xs text-gray-500 border-t pt-3'>{result.disclaimer}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default DoctorFinder
