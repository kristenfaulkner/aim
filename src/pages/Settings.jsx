import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { T, font } from "../theme/tokens";
import { btn, inputStyle } from "../theme/styles";
import { useAuth } from "../context/AuthContext";
import { ArrowLeft, User, Bell, Ruler, Palette, LogOut } from "lucide-react";

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, signout } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const handleSignout = async () => {
    await signout();
    navigate("/");
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: <User size={16} /> },
    { id: "units", label: "Units & Display", icon: <Ruler size={16} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={16} /> },
    { id: "appearance", label: "Appearance", icon: <Palette size={16} /> },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "0 40px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.border}`, background: `${T.surface}cc`, backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => navigate("/dashboard")} style={{ background: "none", border: "none", color: T.textSoft, cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontFamily: font }}>
            <ArrowLeft size={18} /> Dashboard
          </button>
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>Settings</h1>
        <button onClick={handleSignout} style={{ ...btn(false), fontSize: 13, padding: "8px 16px", color: "#ef4444", borderColor: "rgba(239,68,68,0.2)" }}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", maxWidth: 1000, margin: "0 auto", width: "100%", padding: "40px" }}>
        {/* Sidebar tabs */}
        <div style={{ width: 220, marginRight: 40, display: "flex", flexDirection: "column", gap: 4 }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 400, background: activeTab === tab.id ? T.accentDim : "transparent", color: activeTab === tab.id ? T.accent : T.textSoft, border: "none", cursor: "pointer", fontFamily: font, textAlign: "left" }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {activeTab === "profile" && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Profile</h2>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>Manage your account details.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: T.textSoft, display: "block", marginBottom: 6 }}>Name</label>
                  <input defaultValue={profile?.full_name || ""} style={{ ...inputStyle, paddingLeft: 16 }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: T.textSoft, display: "block", marginBottom: 6 }}>Email</label>
                  <input defaultValue={user?.email || profile?.email || ""} disabled style={{ ...inputStyle, paddingLeft: 16, opacity: 0.5 }} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "units" && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Units & Display</h2>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>Choose how data is displayed.</p>
              <p style={{ fontSize: 14, color: T.textDim }}>Coming soon — metric/imperial toggle, timezone, date format.</p>
            </div>
          )}

          {activeTab === "notifications" && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Notifications</h2>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>Control what alerts you receive.</p>
              <p style={{ fontSize: 14, color: T.textDim }}>Coming soon — email digests, insight alerts, sync notifications.</p>
            </div>
          )}

          {activeTab === "appearance" && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Appearance</h2>
              <p style={{ fontSize: 14, color: T.textSoft, margin: "0 0 32px" }}>Customize how AIM looks.</p>
              <p style={{ fontSize: 14, color: T.textDim }}>Coming soon — dashboard layout, widget arrangement.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
