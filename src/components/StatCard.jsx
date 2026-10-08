// Small KPI tile used on the admin and doctor dashboards
const StatCard = ({ icon, label, value }) => (
  <div className='flex items-center gap-3 bg-white p-4 min-w-48 flex-1 rounded border-2 border-gray-100'>
    {icon && <img className='w-12' src={icon} alt='' />}
    <div>
      <p className='text-xl font-semibold text-gray-700'>{value ?? '–'}</p>
      <p className='text-gray-500 text-sm'>{label}</p>
    </div>
  </div>
)

export default StatCard
