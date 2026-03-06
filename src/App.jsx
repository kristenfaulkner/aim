import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ConnectApps from "./pages/ConnectApps";
import Today from "./pages/Today";
import DashboardLegacy from "./pages/DashboardLegacy";
import Boosters from "./pages/Boosters";
import HealthLab from "./pages/HealthLab";
import Sleep from "./pages/Sleep";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import Terms from "./pages/legal/Terms";
import CookiePolicy from "./pages/legal/CookiePolicy";
import DataProcessing from "./pages/legal/DataProcessing";
import GDPR from "./pages/legal/GDPR";
import SmsConsent from "./pages/legal/SmsConsent";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Onboarding from "./pages/Onboarding";
import ActivityDetail from "./pages/ActivityDetail";
import Activities from "./pages/Activities";
import WorkoutDatabase from "./pages/WorkoutDatabase";
import MyStats from "./pages/MyStats";
import Performance from "./pages/Performance";
import Pricing from "./pages/Pricing";
import ResetPassword from "./pages/ResetPassword";
import AcceptTerms from "./pages/AcceptTerms";
import Admin from "./pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import Footer from "./components/Footer";

export default function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<Auth mode="signup" />} />
      <Route path="/signin" element={<Auth mode="signin" />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/accept-terms" element={<ProtectedRoute><AcceptTerms /></ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/connect" element={<ProtectedRoute><ConnectApps /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Today /></ProtectedRoute>} />
      <Route path="/dashboard-legacy" element={<ProtectedRoute><DashboardLegacy /></ProtectedRoute>} />
      <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
      <Route path="/workout-db" element={<ProtectedRoute><WorkoutDatabase /></ProtectedRoute>} />
      <Route path="/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
      <Route path="/my-stats" element={<ProtectedRoute><MyStats /></ProtectedRoute>} />
      <Route path="/boosters" element={<ProtectedRoute><Boosters /></ProtectedRoute>} />
      <Route path="/activity/:id" element={<ProtectedRoute><ActivityDetail /></ProtectedRoute>} />
      <Route path="/sleep" element={<ProtectedRoute><Sleep /></ProtectedRoute>} />
      <Route path="/health-lab" element={<ProtectedRoute><HealthLab /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/cookies" element={<CookiePolicy />} />
      <Route path="/data-processing" element={<DataProcessing />} />
      <Route path="/gdpr" element={<GDPR />} />
      <Route path="/sms-consent" element={<SmsConsent />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
    <Footer />
    </>
  );
}
