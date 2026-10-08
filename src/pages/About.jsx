import React from 'react';
import { assets } from '../assets/assets';

const REASONS = [
  ['EFFICIENCY', 'Streamlined appointment scheduling that fits into your busy lifestyle.'],
  ['CONVENIENCE', 'Access to a network of trusted healthcare professionals in your area.'],
  ['GUIDANCE', 'Not sure who to see? Our AI Doctor Finder suggests a suitable specialty to start with.'],
]

const About = () => {
  return (
    <div>
      <div className='text-center text-2xl pt-10 text-[#707070]'>
        <p>ABOUT <span className='text-gray-700 font-semibold'>US</span></p>
      </div>

      <div className='my-10 flex flex-col md:flex-row gap-12'>
        <img className='w-full md:max-w-[360px]' src={assets.about_image} alt='' />
        <div className='flex flex-col justify-center gap-6 md:w-2/4 text-sm text-gray-600'>
          <p>Welcome to Prescripto, your trusted partner in managing your healthcare needs conveniently and efficiently. We understand the challenges people face when it comes to finding the right doctor and booking appointments.</p>
          <p>Prescripto lets you browse doctors by specialty, see their availability and book a time slot in a few clicks. Our AI Doctor Finder helps you understand which type of specialist may be relevant to your concern. It is a navigation aid, not a diagnosis - a qualified doctor always makes the medical decisions.</p>
          <b className='text-gray-800'>Our Vision</b>
          <p>Our vision is to create a seamless healthcare experience for every user, bridging the gap between patients and healthcare providers and making it easier to get the care you need, when you need it.</p>
        </div>
      </div>

      <div className='text-xl my-4'>
        <p>WHY <span className='text-gray-700 font-semibold'>CHOOSE US</span></p>
      </div>

      <div className='flex flex-col md:flex-row mb-20'>
        {REASONS.map(([title, text]) => (
          <div key={title} className='border px-10 md:px-16 py-8 sm:py-16 flex flex-col gap-5 text-[15px] hover:bg-primary hover:text-white transition-all duration-300 text-gray-600 cursor-pointer'>
            <b>{title}:</b>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default About;
