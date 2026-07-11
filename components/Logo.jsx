export default function Logo({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="8" cy="8" r="3" fill="#8A6D3F" opacity="0.5"/>
      <circle cx="8" cy="20" r="3" fill="#8A6D3F" opacity="0.5"/>
      <circle cx="8" cy="32" r="3" fill="#8A6D3F" opacity="0.5"/>
      <line x1="10.5" y1="9.5" x2="27" y2="20" stroke="#C9C6B8" strokeWidth="1"/>
      <line x1="10.5" y1="20" x2="27" y2="20" stroke="#C9C6B8" strokeWidth="1"/>
      <line x1="10.5" y1="30.5" x2="27" y2="20" stroke="#C9C6B8" strokeWidth="1"/>
      <circle cx="30" cy="20" r="8" fill="#1F6F5C"/>
      <circle cx="30" cy="20" r="3" fill="#F7F6F1"/>
    </svg>
  );
}
