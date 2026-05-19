"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.375rem 0.75rem",
        border: "1px solid var(--border)",
        borderRadius: "9999px",
        backgroundColor: "var(--bg-card)",
        cursor: "pointer",
        color: "var(--text-muted)",
        fontFamily: "var(--font-heading)",
        fontSize: "0.75rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
        transition: "border-color 0.15s, color 0.15s",
        width: "100%",
        justifyContent: "center",
      }}
    >
      <span style={{ fontSize: "0.9rem" }}>
        {theme === "dark" ? "☀" : "☾"}
      </span>
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
