import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import ConnectApps from "./pages/ConnectApps";
import Dashboard from "./pages/Dashboard";
import Boosters from "./pages/Boosters";
import HealthLab from "./pages/HealthLab";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signup" element={<Auth mode="signup" />} />
      <Route path="/signin" element={<Auth mode="signin" />} />
      <Route path="/connect" element={<ConnectApps />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/boosters" element={<Boosters />} />
      <Route path="/health-lab" element={<HealthLab />} />
    </Routes>
  );
}
