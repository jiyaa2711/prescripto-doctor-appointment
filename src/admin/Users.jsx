import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import api, { errorMessage } from '../api/client'
import Pagination from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'
import { formatDate, formatTime } from '../utils/format'

// Side panel with one user's details + appointment history
const UserDetails = ({ userId, onClose, onChanged }) => {
  const [details, setDetails] = useState(null)

  const load = useCallback(() => {
    api.get(`/admin/users/${userId}`)
      .then(({ data }) => setDetails(data))
      .catch((error) => { toast.error(errorMessage(error)); onClose() })
  }, [userId, onClose])

  useEffect(() => { load() }, [load])

  const toggleActive = async () => {
    const { user } = details
    if (!window.confirm(`${user.isActive ? 'Deactivate' : 'Activate'} ${user.name}?`)) return
    try {
      await api.patch(`/admin/users/${user._id}/status`, { isActive: !user.isActive })
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`)
      load()
      onChanged()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  return (
    <div className='fixed inset-0 bg-black/30 z-20 flex justify-end' onClick={onClose}>
      <div className='bg-white w-full max-w-md h-full overflow-y-auto p-6' onClick={(e) => e.stopPropagation()}>
        <div className='flex justify-between items-center mb-4'>
          <p className='text-lg font-medium'>User details</p>
          <button onClick={onClose} className='text-gray-500 text-2xl leading-none' aria-label='Close'>×</button>
        </div>
        {!details ? <p className='text-gray-500'>Loading...</p> : (
          <div className='text-sm space-y-4'>
            <div className='space-y-1'>
              <p className='text-xl font-medium text-gray-800'>{details.user.name}</p>
              <p className='text-gray-600'>{details.user.email}</p>
              <p><span className='capitalize'>{details.user.role}</span> · {details.user.isActive ? 'Active' : 'Inactive'}</p>
              <p className='text-gray-500'>Phone: {details.user.phone || '–'} · Gender: {details.user.gender}</p>
              <p className='text-gray-500'>Joined {new Date(details.user.createdAt).toLocaleDateString()}</p>
            </div>

            {details.user.role !== 'admin' && (
              <button onClick={toggleActive} className={`px-4 py-2 rounded border ${details.user.isActive ? 'border-red-300 text-red-600' : 'border-green-400 text-green-700'}`}>
                {details.user.isActive ? 'Deactivate account' : 'Activate account'}
              </button>
            )}

            <div className='grid grid-cols-4 gap-2 text-center'>
              {Object.entries(details.appointmentCounts).map(([status, count]) => (
                <div key={status} className='border rounded p-2'>
                  <p className='text-lg font-semibold'>{count}</p>
                  <p className='text-xs text-gray-500 capitalize'>{status}</p>
                </div>
              ))}
            </div>

            <div>
              <p className='font-medium mb-2'>Recent appointments</p>
              {details.recentAppointments.length === 0 && <p className='text-gray-500'>None</p>}
              {details.recentAppointments.map((a) => (
                <div key={a._id} className='flex justify-between items-center border-b py-2 gap-2'>
                  <div>
                    <p className='text-gray-800'>{a.doctor?.name} <span className='text-gray-500'>({a.doctor?.specialty})</span></p>
                    <p className='text-gray-500'>{formatDate(a.date)}, {formatTime(a.time)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const Users = () => {
  const [result, setResult] = useState({ users: [], total: 0, page: 1, pages: 1 })
  const [filters, setFilters] = useState({ search: '', role: '', status: '', page: 1 })
  const [selectedId, setSelectedId] = useState(null)

  const loadUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/users', { params: filters })
      setResult(data)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }, [filters])

  useEffect(() => {
    const timer = setTimeout(loadUsers, 300)
    return () => clearTimeout(timer)
  }, [loadUsers])

  const setFilter = (key) => (e) => setFilters({ ...filters, [key]: e.target.value, page: 1 })
  const closeDetails = useCallback(() => setSelectedId(null), [])

  return (
    <div>
      <h1 className='text-xl font-medium text-gray-700 mb-4'>Users <span className='text-sm text-gray-500'>({result.total})</span></h1>

      <div className='flex flex-wrap gap-2 mb-4 text-sm'>
        <input value={filters.search} onChange={setFilter('search')} placeholder='Search name or email' className='border rounded px-3 py-2 bg-white flex-1 min-w-48' />
        <select value={filters.role} onChange={setFilter('role')} className='border rounded px-3 py-2 bg-white'>
          <option value=''>All roles</option>
          <option value='patient'>Patients</option>
          <option value='doctor'>Doctors</option>
          <option value='admin'>Admins</option>
        </select>
        <select value={filters.status} onChange={setFilter('status')} className='border rounded px-3 py-2 bg-white'>
          <option value=''>Active & inactive</option>
          <option value='active'>Active</option>
          <option value='inactive'>Inactive</option>
        </select>
      </div>

      <div className='bg-white border rounded text-sm overflow-x-auto'>
        <table className='w-full min-w-[600px]'>
          <thead className='bg-gray-50 text-left text-gray-600'>
            <tr>
              <th className='px-4 py-3 font-medium'>Name</th>
              <th className='px-4 py-3 font-medium'>Email</th>
              <th className='px-4 py-3 font-medium'>Role</th>
              <th className='px-4 py-3 font-medium'>Status</th>
              <th className='px-4 py-3 font-medium'>Joined</th>
            </tr>
          </thead>
          <tbody>
            {result.users.map((u) => (
              <tr key={u._id} onClick={() => setSelectedId(u._id)} className='border-t hover:bg-gray-50 cursor-pointer'>
                <td className='px-4 py-3 text-gray-800'>{u.name}</td>
                <td className='px-4 py-3 text-gray-600'>{u.email}</td>
                <td className='px-4 py-3 capitalize'>{u.role}</td>
                <td className='px-4 py-3'>
                  <span className={u.isActive ? 'text-green-700' : 'text-red-600'}>{u.isActive ? 'Active' : 'Inactive'}</span>
                </td>
                <td className='px-4 py-3 text-gray-500'>{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {result.users.length === 0 && (
              <tr><td colSpan={5} className='px-4 py-6 text-center text-gray-500'>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={result.page} pages={result.pages} onChange={(page) => setFilters({ ...filters, page })} />

      {selectedId && <UserDetails userId={selectedId} onClose={closeDetails} onChanged={loadUsers} />}
    </div>
  )
}

export default Users
