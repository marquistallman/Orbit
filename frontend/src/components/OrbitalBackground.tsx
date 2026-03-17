export function OrbitalBackground() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <style>{`
        @keyframes orbit1 { from { transform: rotate(0deg) translateX(120px); } to { transform: rotate(360deg) translateX(120px); } }
        @keyframes orbit2 { from { transform: rotate(120deg) translateX(180px); } to { transform: rotate(480deg) translateX(180px); } }
        @keyframes orbit3 { from { transform: rotate(240deg) translateX(250px); } to { transform: rotate(600deg) translateX(250px); } }
        @keyframes orbit4 { from { transform: rotate(60deg) translateX(320px); } to { transform: rotate(420deg) translateX(320px); } }
        @keyframes orbit5 { from { transform: rotate(300deg) translateX(390px); } to { transform: rotate(660deg) translateX(390px); } }
        .on1 { animation: orbit1 30s linear infinite; }
        .on2 { animation: orbit2 45s linear infinite; }
        .on3 { animation: orbit3 60s linear infinite; }
        .on4 { animation: orbit4 50s linear infinite; }
        .on5 { animation: orbit5 70s linear infinite; }
      `}</style>
      {[240,360,500,640,780].map((size, i) => (
        <div key={i} style={{
          position: 'absolute', borderRadius: '50%',
          border: '1px solid rgba(198,161,91,0.08)',
          width: size, height: size,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 1 - i * 0.15
        }} />
      ))}
      {[
        { cls: 'on1', color: '#C6A15B', size: 5, opacity: 0.5 },
        { cls: 'on2', color: '#8C6A3E', size: 4, opacity: 0.4 },
        { cls: 'on3', color: '#C6A15B', size: 6, opacity: 0.3 },
        { cls: 'on4', color: '#7EA8C4', size: 3, opacity: 0.35 },
        { cls: 'on5', color: '#C6A15B', size: 4, opacity: 0.25 },
      ].map((n, i) => (
        <div key={i} className={n.cls} style={{
          position: 'absolute', top: '50%', left: '50%',
          marginLeft: -n.size/2, marginTop: -n.size/2,
          width: n.size, height: n.size,
          background: n.color, borderRadius: '50%',
          opacity: n.opacity
        }} />
      ))}
    </div>
  )
}