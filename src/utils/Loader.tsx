export default function Loader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg width="100%" height="100%" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r="20" stroke="#3498db" strokeWidth="4" fill="none" strokeDasharray="31.415, 31.415" transform="rotate(-90, 25, 25)">
          <animateTransform attributeName="transform" type="rotate" repeatCount="indefinite" dur="1s" values="0 25 25;360 25 25" keyTimes="0;1"></animateTransform>
        </circle>
      </svg>
    </div>
  );
}
