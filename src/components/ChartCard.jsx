import { useState } from 'react'

// Card around a chart with a "View as table" toggle, so the numbers are
// readable without relying on the chart (accessibility).
// rows: [{ label, value }]
const ChartCard = ({ title, subtitle, rows, children }) => {
  const [showTable, setShowTable] = useState(false)

  return (
    <div className='bg-white border rounded p-4 flex-1 min-w-0'>
      <div className='flex items-start justify-between gap-2 mb-3'>
        <div>
          <p className='font-medium text-gray-700'>{title}</p>
          {subtitle && <p className='text-xs text-gray-500'>{subtitle}</p>}
        </div>
        <button onClick={() => setShowTable(!showTable)} className='text-xs text-primary underline shrink-0'>
          {showTable ? 'View as chart' : 'View as table'}
        </button>
      </div>

      {showTable ? (
        <div className='max-h-64 overflow-y-auto'>
          <table className='w-full text-sm'>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className='border-b last:border-0'>
                  <td className='py-1.5 text-gray-600'>{row.label}</td>
                  <td className='py-1.5 text-right tabular-nums text-gray-800'>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : children}
    </div>
  )
}

export default ChartCard
