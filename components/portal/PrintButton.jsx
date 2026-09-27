"use client";
export default function PrintButton({ label = "Print / save as PDF" }) {
  return <button type="button" className="secondary no-print" onClick={() => window.print()}>{label}</button>;
}
