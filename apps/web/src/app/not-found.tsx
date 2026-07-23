import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg)',
        gap: '1.5rem',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '2rem', fontWeight: '700' }}>404</h1>
      <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}>
        Page not found
      </p>
      <Link
        href="/"
        style={{
          padding: '0.5rem 1rem',
          background: 'var(--primary)',
          color: 'white',
          borderRadius: '0.375rem',
          textDecoration: 'none',
          marginTop: '1rem',
        }}
      >
        Go home
      </Link>
    </div>
  );
}
