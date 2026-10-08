const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// "2026-10-05" -> "5 Oct 2026"
export const formatDate = (dateString) => {
  if (!dateString) return ''
  const [y, m, d] = dateString.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

// "14:30" -> "2:30 PM"
export const formatTime = (time) => {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// Date object -> "YYYY-MM-DD" in local time (the format the backend expects)
export const toDateString = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const currency = '$'

// Where each role lands after logging in
export const homeForRole = (role) => (role === 'admin' ? '/admin' : role === 'doctor' ? '/doctor' : '/')
