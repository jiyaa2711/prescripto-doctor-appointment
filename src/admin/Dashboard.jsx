import { useCallback, useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'react-toastify'
import api, { errorMessage, imageUrl } from '../api/client'
import { assets } from '../assets/assets'
import StatCard from '../components/StatCard'
import ChartCard from '../components/ChartCard'
import StatusBadge from '../components/StatusBadge'
import AIInsights from './AIInsights'
import { formatDate, formatTime } from '../utils/format'

// Chart styling: one brand hue (single series), thin bars with rounded data-ends,
// hairline grid, muted axis text.
const BAR_COLOR = '#5f6FFF'
const GRID_COLOR = '#EEF0F4'
const AXIS_TEXT = { fill: '#6B7280', fontSize: 12 }

const ChartTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null
  return (
    <div className='bg-white border rounded shadow-sm px-3 py-2 text-xs'>
      <p className='text-gray-500'>{label}</p>
      <p className='text-gray-800 font-medium'>{payload[0].value} {unit}</p>
    </div>
  )
}

const Dashboard = () => {
  const [stats, setStats] = useState(null)
  const [latest, setLatest] = useState([])

  const loadStats = useCallback(() => {
    api.get('/admin/stats')
      .then(({ data }) => {
        setStats(data.stats)
        setLatest(data.latestAppointments)
      })
      .catch((error) => toast.error(errorMessage(error)))
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  const cancelAppointment = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return
    try {
      await api.patch(`/appointments/${id}/cancel`)
      toast.success('Appointment cancelled')
      loadStats()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  if (!stats) return <p className='text-gray-500'>Loading dashboard...</p>

  const dailyData = stats.bookingsLast14Days.map((d) => ({ label: formatDate(d.date).replace(/ \d{4}$/, ''), count: d.count }))
  const specialtyData = [...stats.bySpecialty].sort((a, b) => b.count - a.count)

  return (
    <div className='space-y-6'>
      <h1 className='text-xl font-medium text-gray-700'>Dashboard</h1>

      {/* KPI row */}
      <div className='flex flex-wrap gap-3'>
        <StatCard icon={assets.patients_icon} label='Patients' value={stats.totalPatients} />
        <StatCard icon={assets.doctor_icon} label={`Doctors (${stats.activeDoctors} active)`} value={stats.totalDoctors} />
        <StatCard icon={assets.appointments_icon} label='Total appointments' value={stats.totalAppointments} />
      </div>
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {[
          ['Active (booked + confirmed)', stats.activeAppointments],
          ['Confirmed', stats.byStatus.confirmed],
          ['Completed', stats.byStatus.completed],
          ['Cancelled', stats.byStatus.cancelled],
        ].map(([label, value]) => (
          <div key={label} className='bg-white border rounded p-3'>
            <p className='text-sm text-gray-500'>{label}</p>
            <p className='text-2xl font-semibold text-gray-700'>{value}</p>
          </div>
        ))}
      </div>

      <AIInsights />

      {/* Charts */}
      <div className='flex flex-col xl:flex-row gap-4'>
        <ChartCard
          title='Bookings per day'
          subtitle='New appointments booked in the last 14 days'
          rows={dailyData.map((d) => ({ label: d.label, value: d.count }))}
        >
          <div className='h-64'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={dailyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRID_COLOR} />
                <XAxis dataKey='label' tick={AXIS_TEXT} tickLine={false} axisLine={{ stroke: GRID_COLOR }} interval='preserveStartEnd' />
                <YAxis allowDecimals={false} tick={AXIS_TEXT} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip unit='bookings' />} cursor={{ fill: '#F2F3FF' }} />
                <Bar dataKey='count' fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title='Appointments by specialty'
          subtitle='All-time, including cancelled'
          rows={specialtyData.map((d) => ({ label: d.specialty, value: d.count }))}
        >
          <div className='h-64'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={specialtyData} layout='vertical' margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke={GRID_COLOR} />
                <XAxis type='number' allowDecimals={false} tick={AXIS_TEXT} tickLine={false} axisLine={false} />
                <YAxis type='category' dataKey='specialty' width={120} tick={AXIS_TEXT} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip unit='appointments' />} cursor={{ fill: '#F2F3FF' }} />
                <Bar dataKey='count' fill={BAR_COLOR} radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Latest bookings */}
      <div className='bg-white border rounded'>
        <div className='flex items-center gap-2.5 px-4 py-4 border-b'>
          <img src={assets.list_icon} alt='' />
          <p className='font-semibold'>Latest Bookings</p>
        </div>
        {latest.length === 0 && <p className='px-6 py-4 text-sm text-gray-500'>No appointments yet.</p>}
        {latest.map((item) => (
          <div key={item._id} className='flex items-center px-4 sm:px-6 py-3 gap-3 hover:bg-gray-50 border-b last:border-0'>
            <img className='rounded-full w-10 h-10 object-cover bg-[#EAEFFF]' src={imageUrl(item.doctor?.photo)} alt='' />
            <div className='flex-1 text-sm min-w-0'>
              <p className='text-gray-800 font-medium truncate'>{item.doctor?.name}</p>
              <p className='text-gray-500 truncate'>{item.name} · {formatDate(item.date)}, {formatTime(item.time)}</p>
            </div>
            {['booked', 'confirmed'].includes(item.status)
              ? <button onClick={() => cancelAppointment(item._id)} title='Cancel appointment'><img className='w-10' src={assets.cancel_icon} alt='Cancel' /></button>
              : <StatusBadge status={item.status} />}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard
