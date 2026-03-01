import { T, font } from "./tokens";

export const btn = (primary) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: primary ? "14px 32px" : "12px 24px",
  background: primary ? T.accent : "transparent",
  color: primary ? T.bg : T.text,
  border: primary ? "none" : `1px solid ${T.border}`,
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 600,
  fontFamily: font,
  cursor: "pointer",
  transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
  letterSpacing: "-0.01em",
  textDecoration: "none",
});

export const inputStyle = {
  width: "100%",
  padding: "14px 16px 14px 44px",
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  fontSize: 15,
  color: T.text,
  fontFamily: font,
  outline: "none",
  transition: "border-color 0.2s",
  boxSizing: "border-box",
};
