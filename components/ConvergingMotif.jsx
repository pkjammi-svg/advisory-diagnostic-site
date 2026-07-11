export default function ConvergingMotif() {
  return (
    <svg className="motif" viewBox="0 0 340 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <line x1="18" y1="14" x2="230" y2="45" stroke="#D8D5C8" strokeWidth="1"/>
      <line x1="14" y1="45" x2="230" y2="45" stroke="#D8D5C8" strokeWidth="1"/>
      <line x1="18" y1="76" x2="230" y2="45" stroke="#D8D5C8" strokeWidth="1"/>
      <line x1="26" y1="60" x2="230" y2="45" stroke="#D8D5C8" strokeWidth="1"/>
      <circle cx="18" cy="14" r="4" fill="#8A6D3F" opacity="0.55"/>
      <circle cx="14" cy="45" r="4" fill="#8A6D3F" opacity="0.55"/>
      <circle cx="18" cy="76" r="4" fill="#8A6D3F" opacity="0.55"/>
      <circle cx="26" cy="60" r="3" fill="#8A6D3F" opacity="0.4"/>
      <circle cx="230" cy="45" r="7" fill="#1F6F5C"/>
      <circle cx="230" cy="45" r="12" stroke="#1F6F5C" strokeWidth="1" opacity="0.35"/>
      <text x="248" y="49" fontFamily="IBM Plex Mono, monospace" fontSize="11" letterSpacing="0.04em" fill="#1F6F5C">real cause</text>
    </svg>
  );
}
