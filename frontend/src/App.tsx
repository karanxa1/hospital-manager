import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Toaster } from "sonner"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import RoleLayout from "@/components/RoleLayout"

import Landing from "@/pages/Landing"
import Login from "@/pages/auth/Login"
import Signup from "@/pages/auth/Signup"
import Unauthorized from "@/pages/auth/Unauthorized"
import NotFound from "@/pages/NotFound"
import TokenDisplay from "@/pages/TokenDisplay"

import PatientDashboard from "@/pages/patient/Dashboard"
import HospitalMap from "@/pages/patient/HospitalMap"
import PatientProfile from "@/pages/patient/PatientProfile"
import BookAppointment from "@/pages/patient/BookAppointment"
import MyAppointments from "@/pages/patient/MyAppointments"
import MedicalHistory from "@/pages/patient/MedicalHistory"
import PayOnline from "@/pages/patient/PayOnline"

import DoctorDashboard from "@/pages/doctor/Dashboard"
import MySchedule from "@/pages/doctor/MySchedule"
import TodayQueue from "@/pages/doctor/TodayQueue"
import WriteRecord from "@/pages/doctor/WriteRecord"
import PatientView from "@/pages/doctor/PatientView"

import AdminDashboard from "@/pages/admin/Dashboard"
import DoctorManagement from "@/pages/admin/DoctorManagement"
import PatientList from "@/pages/admin/PatientList"
import AppointmentCalendar from "@/pages/admin/AppointmentCalendar"
import BillingDashboard from "@/pages/admin/BillingDashboard"
import AnalyticsDashboard from "@/pages/admin/AnalyticsDashboard"
import WalkInDesk from "@/pages/admin/WalkInDesk"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/display/:doctorId" element={<TokenDisplay />} />

        <Route element={<ProtectedRoute allowedRoles={["patient"]} />}>
          <Route element={<RoleLayout />}>
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path="/patient/hospitals" element={<HospitalMap />} />
            <Route path="/patient/book" element={<BookAppointment />} />
            <Route path="/patient/appointments" element={<MyAppointments />} />
            <Route path="/patient/history" element={<MedicalHistory />} />
            <Route path="/patient/profile" element={<PatientProfile />} />
            <Route path="/patient/pay/:invoiceId" element={<PayOnline />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["doctor"]} />}>
          <Route element={<RoleLayout />}>
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
            <Route path="/doctor/today" element={<TodayQueue />} />
            <Route path="/doctor/schedule" element={<MySchedule />} />
            <Route path="/doctor/patients" element={<PatientView />} />
            <Route path="/doctor/record/:appointmentId" element={<WriteRecord />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route element={<RoleLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/doctors" element={<DoctorManagement />} />
            <Route path="/admin/patients" element={<PatientList />} />
            <Route path="/admin/appointments" element={<AppointmentCalendar />} />
            <Route path="/admin/walkin" element={<WalkInDesk />} />
            <Route path="/admin/billing" element={<BillingDashboard />} />
            <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-right" theme="system" />
    </BrowserRouter>
  )
}
