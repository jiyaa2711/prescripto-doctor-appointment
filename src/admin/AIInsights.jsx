import { useState } from 'react'
import api, { errorMessage } from '../api/client'

// "Generate AI Insights" card on the admin dashboard.
// The backend sends only aggregated counts to the AI (no patient names/emails).
const AIInsights = () => {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/admin/ai-insights')
      setResult(data)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='bg-white border rounded p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <p className='font-medium text-gray-700'>AI Insights</p>
          <p className='text-xs text-gray-500'>A short AI summary of the anonymous appointment statistics.</p>
        </div>
        <button onClick={generate} disabled={loading} className='bg-primary text-white text-sm px-5 py-2 rounded-full disabled:opacity-60'>
          {loading ? 'Generating...' : result ? 'Regenerate' : 'Generate AI Insights'}
        </button>
      </div>

      <div aria-live='polite'>
        {error && <p className='mt-3 text-sm text-red-600'>{error}</p>}
        {result && !result.aiAvailable && <p className='mt-3 text-sm text-gray-600'>{result.message}</p>}
        {result?.aiAvailable && (
          <div className='mt-3 text-sm text-gray-700 space-y-2'>
            <p>{result.insights.summary}</p>
            <ul className='list-disc pl-5 space-y-1 text-gray-600'>
              {result.insights.highlights.map((h) => <li key={h}>{h}</li>)}
            </ul>
            <p className='text-xs text-gray-400'>Generated {new Date(result.generatedAt).toLocaleString()} · AI-generated, please verify against the numbers above.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AIInsights
