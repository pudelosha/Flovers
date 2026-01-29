import React from "react";

export default function Stat({ label, value }) {
  return (
    <div className="home-stat">
      <div className="home-stat-value">{value}</div>
      <div className="home-stat-label muted">{label}</div>
    </div>
  );
}