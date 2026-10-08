import React from 'react';
import { assets } from '../assets/assets';

const Contact = () => {
  return (
    <div>
      <div className='text-center text-2xl pt-10 text-[#707070]'>
        <p>CONTACT <span className='text-gray-700 font-semibold'>US</span></p>
      </div>

      <div className='my-10 flex flex-col justify-center md:flex-row gap-10 mb-28 text-sm'>
        <img className='w-full md:max-w-[360px]' src={assets.contact_image} alt='' />
        <div className='flex flex-col justify-center items-start gap-6'>
          <p className='font-semibold text-lg text-gray-600'>OUR OFFICE</p>
          <p className='text-gray-500'>54709 Willms Station <br /> Suite 350, Washington, USA</p>
          <p className='text-gray-500'>Tel: +1-212-456-7890 <br /> Email: support@prescripto.test</p>
          <p className='font-semibold text-lg text-gray-600'>IN AN EMERGENCY</p>
          <p className='text-gray-500 max-w-sm'>Prescripto is for booking regular appointments. If you have a medical emergency, call your local emergency number or go to the nearest emergency department.</p>
        </div>
      </div>
    </div>
  );
}

export default Contact;
