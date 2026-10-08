const Pagination = ({ page, pages, onChange }) => {
  if (pages <= 1) return null
  return (
    <div className='flex items-center justify-end gap-2 mt-4 text-sm'>
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className='px-3 py-1 border rounded bg-white disabled:opacity-40'>Previous</button>
      <span className='text-gray-500'>Page {page} of {pages}</span>
      <button disabled={page >= pages} onClick={() => onChange(page + 1)} className='px-3 py-1 border rounded bg-white disabled:opacity-40'>Next</button>
    </div>
  )
}

export default Pagination
