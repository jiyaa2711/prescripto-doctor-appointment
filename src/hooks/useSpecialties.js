import { useEffect, useState } from 'react'
import api from '../api/client'

// The controlled specialty list comes from the backend (single source of truth).
// Returns [{ name, doctorCount }]
const useSpecialties = () => {
  const [specialties, setSpecialties] = useState([])

  useEffect(() => {
    api.get('/doctors/specialties')
      .then(({ data }) => setSpecialties(data.specialties))
      .catch(() => setSpecialties([]))
  }, [])

  return specialties
}

export default useSpecialties
