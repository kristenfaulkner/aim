import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ConnectApps from "./pages/ConnectApps";
import Dashboard from "./pages/Dashboard";
import Boosters from "./pages/Boosters";
import HealthLab from "./pages/HealthLab";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import Terms from "./pages/legal/Terms";
import CookiePolicy from "./pages/legal/CookiePolicy";
import DataProcessing from "./pages/legal/DataProcessing";
import GDPR from "./pages/legal/GDPR";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<Auth mode="signup" />} />
      <Route path="/signin" element={<Auth mode="signin" />} />
      <Route path="/connect" element={<ProtectedRoute><ConnectApps /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/boosters" element={<ProtectedRoute><Boosters /></ProtectedRoute>} />
      <Route path="/health-lab" element={<ProtectedRoute><HealthLab /></ProtectedRoute>} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/cookies" element={<CookiePolicy />} />
      <Route path="/data-processing" element={<DataProcessing />} />
      <Route path="/gdpr" element={<GDPR />} />
    </Routes>
  );
}
