// Single-series horizontal bar list: label, bar, value. One hue; identity is in the text label.
export default function BarList({ items, total }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="barlist">
      {items.map((i) => (
        <li key={i.label} title={`${i.label}: ${i.value}${total ? ` (${Math.round((i.value / total) * 100)}%)` : ""}`}>
          <span className="barlist-label">{i.label}</span>
          <span className="barlist-track"><span className="barlist-bar" style={{ width: `${(i.value / max) * 100}%` }} /></span>
          <span className="barlist-value">{i.value}</span>
        </li>
      ))}
    </ul>
  );
}
