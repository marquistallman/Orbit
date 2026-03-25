export default function OrDivider() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      margin: '4px 0',
    }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(198,161,91,0.2)' }} />
      <span style={{ fontSize: 11, color: '#8C6A3E', letterSpacing: 1 }}>or</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(198,161,91,0.2)' }} />
    </div>
  )
}
