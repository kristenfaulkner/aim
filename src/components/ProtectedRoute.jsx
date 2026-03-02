import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { T } from "../theme/tokens";

export default function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: T.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: T.bg }}>AI</div>
          <div style={{ width: 24, height: 24, border: `2px solid ${T.border}`, borderTop: `2px solid ${T.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/signin" replace />;

  // Redirect to accept-terms if consent not recorded (but don't loop if already there)
  if (profile && !profile.terms_accepted_at && location.pathname !== "/accept-terms") {
    return <Navigate to="/accept-terms" replace />;
  }

  // Redirect to onboarding if profile not completed (but don't loop if already there)
  if (profile && !profile.onboarding_completed && location.pathname !== "/onboarding" && location.pathname !== "/accept-terms") {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
