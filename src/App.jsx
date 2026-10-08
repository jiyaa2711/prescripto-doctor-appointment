import React from 'react';
import { Routes , Route, Outlet }  from 'react-router-dom'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Doctors from './pages/Doctors';
import MyAppointment from './pages/MyAppointment';
import MyProfile from './pages/MyProfile';
import Appointment from './pages/Appointment';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import PanelLayout from './components/PanelLayout';
import { assets } from './assets/assets';
// Admin panel
import AdminDashboard from './admin/Dashboard';
import AdminDoctorsList from './admin/DoctorsList';
import AdminDoctorForm from './admin/DoctorForm';
import AdminUsers from './admin/Users';
import AdminAppointments from './admin/Appointments';
// Doctor panel
import DoctorDashboard from './doctor/DoctorDashboard';
import DoctorAppointments from './doctor/DoctorAppointments';
import DoctorProfile from './doctor/DoctorProfile';

const ADMIN_LINKS = [
  { to: '/admin', label: 'Dashboard', icon: assets.home_icon, end: true },
  { to: '/admin/appointments', label: 'Appointments', icon: assets.appointment_icon },
  { to: '/admin/doctors/new', label: 'Add Doctor', icon: assets.add_icon },
  { to: '/admin/doctors', label: 'Doctors List', icon: assets.people_icon, end: true },
  { to: '/admin/users', label: 'Users', icon: assets.patients_icon },
]

const DOCTOR_LINKS = [
  { to: '/doctor', label: 'Dashboard', icon: assets.home_icon, end: true },
  { to: '/doctor/appointments', label: 'Appointments', icon: assets.appointment_icon },
  { to: '/doctor/profile', label: 'Profile', icon: assets.people_icon },
]

// Patient-facing website layout (navbar + page margins)
const SiteLayout = () => (
  <div className='mx-4 sm:mx-[10%]'>
    <Navbar></Navbar>
    <Outlet />
    <Footer />
  </div>
)

const App = () => {
  return (
    <>
      <ToastContainer position='top-right' autoClose={3000} />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path='/' element={<Home />}/>
          <Route path='/about' element={<About />}/>
          <Route path='/contact' element={<Contact />}/>
          <Route path='/login' element={<Login />}/>
          <Route path='/doctors' element={< Doctors/>} />
          <Route path='/doctors/:speciality' element={<Doctors />}/>
          <Route path='/appointment/:docId' element={<Appointment />} />
          <Route element={<ProtectedRoute roles={['patient']} />}>
            <Route path='/my-appointment' element={<MyAppointment />}/>
            <Route path='/my-profile' element={<MyProfile />}/>
          </Route>
        </Route>

        {/* Admin panel - UI guard only; every /api/admin call is checked by the backend */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path='/admin' element={<PanelLayout title='Admin' links={ADMIN_LINKS} />}>
            <Route index element={<AdminDashboard />} />
            <Route path='appointments' element={<AdminAppointments />} />
            <Route path='doctors' element={<AdminDoctorsList />} />
            <Route path='doctors/new' element={<AdminDoctorForm key='new' />} />
            <Route path='doctors/:id/edit' element={<AdminDoctorForm key='edit' />} />
            <Route path='users' element={<AdminUsers />} />
          </Route>
        </Route>

        {/* Doctor panel */}
        <Route element={<ProtectedRoute roles={['doctor']} />}>
          <Route path='/doctor' element={<PanelLayout title='Doctor' links={DOCTOR_LINKS} />}>
            <Route index element={<DoctorDashboard />} />
            <Route path='appointments' element={<DoctorAppointments />} />
            <Route path='profile' element={<DoctorProfile />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
