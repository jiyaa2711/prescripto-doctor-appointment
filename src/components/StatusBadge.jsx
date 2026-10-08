// Appointment status pill. The text label always carries the meaning (not color alone).
const STYLES = {
  booked: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
}

const StatusBadge = ({ status }) => (
  <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full border capitalize ${STYLES[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
    {status}
  </span>
)

export default StatusBadge
