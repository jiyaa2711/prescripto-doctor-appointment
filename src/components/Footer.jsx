import { useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'

const Footer = () => {
  const navigate = useNavigate()
  const go = (path) => { navigate(path); window.scrollTo(0, 0) }

  return (
    <div className='md:mx-10'>
      <div className='flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-40 text-sm'>
        <div>
          <img className='mb-5 w-40' src={assets.logo} alt='Prescripto' />
          <p className='w-full md:w-2/3 text-gray-600 leading-6'>
            Prescripto helps you find the right doctor and book appointments online. Browse trusted doctors by specialty,
            or describe your concern to our AI Doctor Finder to see which department may be a good starting point.
          </p>
        </div>
        <div>
          <p className='text-xl font-medium mb-5'>COMPANY</p>
          <ul className='flex flex-col gap-2 text-gray-600'>
            <li className='cursor-pointer hover:text-black' onClick={() => go('/')}>Home</li>
            <li className='cursor-pointer hover:text-black' onClick={() => go('/about')}>About us</li>
            <li className='cursor-pointer hover:text-black' onClick={() => go('/doctors')}>All doctors</li>
            <li className='cursor-pointer hover:text-black' onClick={() => go('/contact')}>Contact us</li>
          </ul>
        </div>
        <div>
          <p className='text-xl font-medium mb-5'>GET IN TOUCH</p>
          <ul className='flex flex-col gap-2 text-gray-600'>
            <li>+1-212-456-7890</li>
            <li>support@prescripto.test</li>
          </ul>
        </div>
      </div>
      <div>
        <hr />
        <p className='py-5 text-sm text-center'>Copyright {new Date().getFullYear()} © Prescripto - All Rights Reserved.</p>
      </div>
    </div>
  )
}

export default Footer
