import React from 'react';
import Header from '../components/Header';
import DoctorFinder from '../components/DoctorFinder';
import SpecialityMenu from '../components/SpecialityMenu';
import TopDoctors from '../components/TopDoctors';
import Banner from '../components/Banner';

const Home = () => {
  return (
    <div>
      <Header />
      <DoctorFinder />
      <SpecialityMenu />
      <TopDoctors />
      <Banner />
    </div>
  );
}

export default Home;
