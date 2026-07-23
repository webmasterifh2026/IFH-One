'use client';

import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  LogIn,
  Layers,
  ChevronRight,
  Shield,
  Zap,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { login } from '@/lib/api/auth';
import { isAuthenticated } from '@/lib/auth';
import { APP_VERSION } from '@/config/version';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated()) {
      window.location.href = '/dashboard';
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      const redirectTo = sessionStorage.getItem('postLoginRedirect');
      sessionStorage.removeItem('postLoginRedirect');
      window.location.href = redirectTo || '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#fff' }}>
      {/* ━━━ Left Panel — Branding ━━━ */}
      <div
        style={{
          width: 480,
          flexShrink: 0,
          background:
            'linear-gradient(160deg, #071F12 0%, #0F3D20 60%, #1a5c32 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '40px 48px',
          position: 'relative',
          overflow: 'hidden',
        }}
        className="login-left-panel"
      >
        {/* Subtle radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(15,123,69,0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              marginBottom: 60,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: '#0F7B45',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers style={{ width: 20, height: 20, color: '#fff' }} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1,
                  letterSpacing: '-0.01em',
                }}
              >
                IFH One
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.45)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}
              >
                Procurement ERP
              </div>
            </div>
          </Link>

          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: 16,
            }}
          >
            Enterprise
            <br />
            Procurement,
            <br />
            <span style={{ color: '#4ADE80' }}>Simplified.</span>
          </h1>
          <p
            style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.7,
              maxWidth: 340,
            }}
          >
            End-to-end procurement management from indent to payment — tracked,
            audited, and governed.
          </p>
        </div>

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {[
            { icon: Zap, text: '22-Stage Automated Workflow' },
            { icon: Shield, text: 'Role-Based Access Control' },
            { icon: BarChart3, text: 'Real-Time Analytics' },
          ].map((f) => (
            <div
              key={f.text}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(15,123,69,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <f.icon style={{ width: 16, height: 16, color: '#4ADE80' }} />
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 500,
                }}
              >
                {f.text}
              </span>
            </div>
          ))}
          <div
            style={{
              marginTop: 20,
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              fontWeight: 500,
            }}
          >
            &copy; 2026 Intensiv-Filter Himenviro &middot; Version v
            {APP_VERSION}
          </div>
        </div>
      </div>

      {/* ━━━ Right Panel — Login Form ━━━ */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 64px',
        }}
        className="login-right-panel"
      >
        {/* Breadcrumb */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 48,
          }}
          aria-label="Breadcrumb"
        >
          <Link
            href="/"
            style={{
              fontSize: 13,
              color: '#64748B',
              textDecoration: 'none',
              transition: 'color 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0F7B45')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
          >
            Home
          </Link>
          <ChevronRight style={{ width: 14, height: 14, color: '#CBD5E1' }} />
          <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 600 }}>
            Login
          </span>
        </nav>

        <div style={{ maxWidth: 400 }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.03em',
              margin: '0 0 8px',
            }}
          >
            Welcome back
          </h2>
          <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 32px' }}>
            Sign in to your IFH One account
          </p>

          {/* Login Card */}
          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: 10,
                  padding: '12px 16px',
                  marginBottom: 20,
                  color: '#991B1B',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 6,
                }}
              >
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@if-himenviro.in"
                autoComplete="email"
                required
                aria-label="Email Address"
                style={{
                  width: '100%',
                  height: 46,
                  padding: '0 14px',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: 10,
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 150ms, box-shadow 150ms',
                  boxSizing: 'border-box',
                  background: '#fff',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0F7B45';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 3px rgba(15,123,69,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label
                htmlFor="login-password"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  aria-label="Password"
                  style={{
                    width: '100%',
                    height: 46,
                    padding: '0 44px 0 14px',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: 10,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 150ms, box-shadow 150ms',
                    boxSizing: 'border-box',
                    background: '#fff',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0F7B45';
                    e.currentTarget.style.boxShadow =
                      '0 0 0 3px rgba(15,123,69,0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94A3B8',
                    padding: 4,
                    transition: 'color 150ms',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = '#334155')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = '#94A3B8')
                  }
                >
                  {showPw ? (
                    <EyeOff style={{ width: 18, height: 18 }} />
                  ) : (
                    <Eye style={{ width: 18, height: 18 }} />
                  )}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 28,
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#64748B',
                }}
              >
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#0F7B45' }}
                />
                Remember me
              </label>
              <span
                style={{
                  fontSize: 13,
                  color: '#94A3B8',
                  cursor: 'not-allowed',
                }}
              >
                Forgot password?
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: 48,
                background: loading ? '#94A3B8' : '#0F7B45',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 200ms',
                boxShadow: loading ? 'none' : '0 4px 14px rgba(15,123,69,0.2)',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#0B6237';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#0F7B45';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      display: 'inline-block',
                      animation: 'spin 0.7s linear infinite',
                    }}
                  />
                  Signing in...
                </span>
              ) : (
                <>
                  <LogIn style={{ width: 16, height: 16 }} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <span style={{ fontSize: 13, color: '#94A3B8' }}>
              Need access?{' '}
            </span>
            <a
              href="mailto:admin@if-himenviro.in"
              style={{
                fontSize: 13,
                color: '#0F7B45',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Contact Admin
            </a>
          </div>
        </div>
      </div>

      {/* Responsive: hide left panel on mobile */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .login-left-panel { display: none !important; }
          .login-right-panel { padding: 32px 24px !important; }
        }
      `}</style>
    </div>
  );
}
