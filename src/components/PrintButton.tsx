"use client";

export default function PrintButton() {
  return (
    <button className="rpt-btn rpt-btn-primary" onClick={() => window.print()}>
      Save as PDF
    </button>
  );
}
