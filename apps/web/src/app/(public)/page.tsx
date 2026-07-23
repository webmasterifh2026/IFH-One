'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Layers, ArrowRight, Shield, BarChart3, Package, FileText, Search, Users, Settings,
  CheckCircle, Clock, Zap, Lock, Database, ChevronDown, ChevronRight, Menu, X,
  TrendingUp, Eye, Truck, CreditCard, ClipboardList,
  PieChart, Activity, UserCheck, Building2, LayoutDashboard, ShoppingCart,
  Briefcase, FileCheck, Workflow, Mail, Globe, MapPin, SearchCode, Command
} from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';
import { APP_VERSION } from '@/config/version';

/* ────────────────────────── Hooks & Components ────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { 
      if (e.isIntersecting) { 
        el.style.opacity = '1'; 
        el.style.transform = 'translateY(0)'; 
        obs.unobserve(el); 
      } 
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Section({ children, style, id, className = '' }: { children: React.ReactNode; style?: React.CSSProperties; id?: string, className?: string }) {
  const ref = useReveal();
  return (
    <div 
      ref={ref} 
      id={id} 
      className={`landing-section ${className}`} 
      style={{ 
        padding: '160px 24px', 
        maxWidth: 1400, 
        margin: '0 auto', 
        opacity: 0, 
        transform: 'translateY(40px)', 
        transition: 'all 800ms cubic-bezier(0.16, 1, 0.3, 1)', 
        ...style 
      }}
    >
      {children}
    </div>
  );
}

function Counter({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        let start = 0;
        const step = Math.max(1, Math.floor(end / (duration / 16)));
        const timer = setInterval(() => { start = Math.min(start + step, end); setVal(start); if (start >= end) clearInterval(timer); }, 16);
        obs.unobserve(el);
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [end, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━ LANDING PAGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  // Parallax state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isAuthenticated()) router.replace('/dashboard');
  }, [router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position between -1 and 1
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleCreateIndent = useCallback((e: React.MouseEvent) => {
    if (!localStorage.getItem('ifh_token')) {
      e.preventDefault();
      sessionStorage.setItem('postLoginRedirect', '/indents/new');
      window.location.href = '/login';
    }
  }, []);

  const navLinks = [
    { label: 'Platform', href: '#platform' },
    { label: 'Workflow', href: '#workflow' },
    { label: 'Search', href: '#search' },
    { label: 'Modules', href: '#modules' },
  ];

  const workflowSteps = [
    { icon: ClipboardList, label: 'Indent', status: 'done', x: 10, y: 0 },
    { icon: Eye, label: 'Verification', status: 'done', x: 25, y: -40 },
    { icon: Package, label: 'Store', status: 'done', x: 40, y: 20 },
    { icon: FileText, label: 'RFQ', status: 'done', x: 55, y: -20 },
    { icon: CreditCard, label: 'Quotation', status: 'active', x: 70, y: 40 },
    { icon: Settings, label: 'Evaluation', status: 'pending', x: 85, y: -30 },
    { icon: CheckCircle, label: 'Approval', status: 'pending', x: 100, y: 10 },
    { icon: ShoppingCart, label: 'Purchase Order', status: 'pending', x: 115, y: -40 },
    { icon: Truck, label: 'Receipt', status: 'pending', x: 130, y: 20 },
    { icon: FileCheck, label: 'Bill', status: 'pending', x: 145, y: -20 },
    { icon: Zap, label: 'Payment', status: 'pending', x: 160, y: 0 },
  ];

  const modules = [
    { icon: LayoutDashboard, title: 'Dashboard', desc: 'Real-time KPIs and operational overview', color: '#3B82F6' },
    { icon: ShoppingCart, title: 'Procurement', desc: 'Complete procurement lifecycle management', color: '#10B981' },
    { icon: Package, title: 'Items', desc: 'Master inventory with 18,000+ SKUs', color: '#8B5CF6' },
    { icon: Briefcase, title: 'Projects', desc: 'Project-based budget tracking', color: '#F59E0B' },
    { icon: Building2, title: 'Vendors', desc: 'Vendor database and performance analytics', color: '#EC4899' },
    { icon: Users, title: 'Users', desc: 'User management with RBAC controls', color: '#6366F1' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: 'var(--font-sans)', color: '#0F172A', overflowX: 'hidden' }}>

      {/* ━━━━━━━ NAVBAR ━━━━━━━ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 80,
        background: scrolled ? 'rgba(255, 255, 255, 0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(226, 232, 240, 0.8)' : '1px solid transparent',
        transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0F7B45', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(15, 123, 69, 0.2)' }}>
            <Layers style={{ width: 20, height: 20, color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', lineHeight: 1, letterSpacing: '-0.02em' }}>IFH One</div>
          </div>
        </Link>

        {/* Center nav — desktop */}
        <div style={{ display: 'flex', gap: 8, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} className="nav-center">
          <Link href="/" style={{ padding: '8px 16px', fontSize: 15, fontWeight: 600, color: '#0F172A', textDecoration: 'none', borderRadius: 99, transition: 'all 200ms', background: 'rgba(15, 23, 42, 0.04)' }}>Home</Link>
          {navLinks.map(l => (
            <a key={l.label} href={l.href} style={{ padding: '8px 16px', fontSize: 15, fontWeight: 500, color: '#64748B', textDecoration: 'none', borderRadius: 99, transition: 'all 200ms' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.background = 'rgba(15, 23, 42, 0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = 'transparent'; }}
            >{l.label}</a>
          ))}
        </div>

        {/* Right nav — desktop */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} className="nav-right">
          <Link href="/indents/new" onClick={handleCreateIndent} style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', textDecoration: 'none', transition: 'color 200ms' }}>Create Indent</Link>
          <Link href="/login" style={{ fontSize: 15, fontWeight: 600, color: '#fff', background: '#0F172A', padding: '12px 24px', borderRadius: 12, textDecoration: 'none', transition: 'all 300ms', boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.15)'; }}
          >Sign In</Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileMenu(!mobileMenu)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: '#0F172A', padding: 4 }} className="nav-hamburger">
          {mobileMenu ? <X style={{ width: 28, height: 28 }} /> : <Menu style={{ width: 28, height: 28 }} />}
        </button>
      </nav>

      {/* ━━━━━━━ HERO ━━━━━━━ */}
      <div style={{ paddingTop: 200, paddingBottom: 100, textAlign: 'center', position: 'relative' }}>
        
        {/* Floating background blobs for premium feel */}
        <div style={{ position: 'absolute', top: '10%', left: '20%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(15,123,69,0.06) 0%, rgba(255,255,255,0) 70%)', transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)`, pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'absolute', top: '30%', right: '10%', width: '30vw', height: '30vw', background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, rgba(255,255,255,0) 70%)', transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 30}px)`, pointerEvents: 'none', zIndex: 0 }} />

        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 10 }}>
          
          {/* Typography block */}
          <div style={{ position: 'relative', zIndex: 20, marginBottom: 40 }}>
            {/* Announcement Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 99, padding: '8px 20px', marginBottom: 40, boxShadow: '0 8px 24px rgba(0,0,0,0.04)', transition: 'transform 300ms', cursor: 'default' }}
                 onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                 onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ background: '#DCFCE7', color: '#0F7B45', fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 99, letterSpacing: '0.05em' }}>NEW</div>
              <span style={{ color: '#0F172A', fontSize: 14, fontWeight: 600, letterSpacing: '0.01em' }}>Version v{APP_VERSION} is now live</span>
              <ArrowRight style={{ width: 16, height: 16, color: '#64748B' }} />
            </div>

            <h1 style={{ margin: '0 0 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 'clamp(48px, 6vw, 76px)', fontWeight: 400, fontStyle: 'italic', fontFamily: '"Georgia", "Times New Roman", serif', color: '#475569', letterSpacing: '-0.02em', lineHeight: 1 }}>
                The Operating System
              </span>
              <span style={{ fontSize: 'clamp(80px, 10vw, 140px)', fontWeight: 900, color: '#0F7B45', letterSpacing: '-0.05em', lineHeight: 0.9, textShadow: '0 20px 40px rgba(15,123,69,0.1)' }}>
                Procurement.
              </span>
            </h1>

            <p style={{ fontSize: 'clamp(20px, 2.5vw, 26px)', color: '#64748B', lineHeight: 1.6, maxWidth: 750, margin: '0 auto 56px', fontWeight: 400, letterSpacing: '-0.01em' }}>
              One unified workspace designed specifically for enterprise procurement teams. Manage indents, enforce strict RBAC approvals, and track multi-million dollar budgets with absolute clarity.
            </p>

            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#0F172A', color: '#fff', padding: '20px 48px', borderRadius: 16, fontSize: 18, fontWeight: 600, textDecoration: 'none', transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.2)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(15, 23, 42, 0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(15, 23, 42, 0.2)'; }}
              >
                Sign In <ArrowRight style={{ width: 20, height: 20 }} />
              </Link>
            </div>
          </div>

          {/* Floating UI Elements (Filling Whitespace) */}
          <div style={{ position: 'absolute', top: '10%', left: '5%', transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 30}px)`, zIndex: 30, transition: 'transform 0.2s ease-out' }}>
            <div style={{ background: '#fff', padding: '16px 24px', borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.08)', border: '1px solid rgba(226, 232, 240, 0.8)', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E8F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle style={{ width: 20, height: 20, color: '#0F7B45' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>PO-2026-8492</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Approved</div>
              </div>
            </div>
          </div>

          <div style={{ position: 'absolute', top: '40%', right: '2%', transform: `translate(${mousePos.x * -40}px, ${mousePos.y * -40}px)`, zIndex: 30, transition: 'transform 0.2s ease-out' }}>
            <div style={{ background: '#fff', padding: '20px', borderRadius: 20, boxShadow: '0 30px 60px rgba(0,0,0,0.1)', border: '1px solid rgba(226, 232, 240, 0.8)', width: 240, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp style={{ width: 18, height: 18, color: '#0F172A' }} />
                </div>
                <span style={{ fontSize: 13, color: '#059669', fontWeight: 700 }}>+12%</span>
              </div>
              <div style={{ fontSize: 14, color: '#64748B', fontWeight: 600, marginBottom: 4 }}>Total Spend</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>₹14.2 Cr</div>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '25%', left: '12%', transform: `translate(${mousePos.x * 20}px, ${mousePos.y * 20}px)`, zIndex: 30, transition: 'transform 0.2s ease-out' }}>
            <div style={{ background: '#fff', padding: '12px 20px', borderRadius: 99, boxShadow: '0 16px 32px rgba(0,0,0,0.06)', border: '1px solid rgba(226, 232, 240, 0.8)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Command style={{ width: 16, height: 16, color: '#64748B' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Search 18,000+ items</span>
            </div>
          </div>
          
          <div style={{ position: 'absolute', top: '15%', right: '15%', transform: `translate(${mousePos.x * 15}px, ${mousePos.y * 15}px)`, zIndex: 30, transition: 'transform 0.2s ease-out' }}>
            <div style={{ background: '#fff', padding: '12px', borderRadius: '50%', boxShadow: '0 16px 32px rgba(0,0,0,0.06)', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
              <Shield style={{ width: 24, height: 24, color: '#2563EB' }} />
            </div>
          </div>
        </div>

        {/* ━━━━━━━ INTERACTIVE PRODUCT PREVIEW ━━━━━━━ */}
        <div style={{ 
          maxWidth: 1300, 
          margin: '100px auto 0', 
          padding: '0 24px', 
          position: 'relative', 
          zIndex: 20,
          perspective: 2000
        }}>
          
          <div style={{ 
            background: '#fff', 
            borderRadius: 24, 
            border: '1px solid rgba(226, 232, 240, 0.8)', 
            boxShadow: '0 50px 100px -20px rgba(15, 23, 42, 0.15), 0 30px 60px -30px rgba(15, 23, 42, 0.1)', 
            overflow: 'hidden', 
            position: 'relative',
            transform: `rotateX(${mousePos.y * 2}deg) rotateY(${mousePos.x * -2}deg)`,
            transition: 'transform 0.1s ease-out'
          }}>
            {/* Modern Browser Frame */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: '#FAFAFA', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#CBD5E1' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#CBD5E1' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#CBD5E1' }} />
              </div>
              <div style={{ background: '#fff', borderRadius: 8, padding: '8px 250px', fontSize: 13, color: '#94A3B8', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <Lock style={{ width: 12, height: 12 }} />
                ifh-one.internal.co
              </div>
              <div style={{ width: 60 }} /> {/* Spacer */}
            </div>
            
            {/* Full Dashboard Mockup */}
            <div style={{ display: 'flex', height: '70vh', minHeight: 650 }}>
              {/* Sidebar */}
              <div style={{ width: 260, background: '#0F172A', padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', marginBottom: 40 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0F7B45', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(15,123,69,0.3)' }}>
                    <Layers style={{ width: 18, height: 18, color: '#fff' }} />
                  </div>
                  <span style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>IFH One</span>
                </div>
                {['Command Center', 'Procurement', 'Inventory', 'Vendors', 'Projects'].map((item, i) => (
                  <div key={item} style={{ 
                    padding: '12px 16px', 
                    borderRadius: 10, 
                    fontSize: 15, 
                    fontWeight: 600, 
                    color: i === 0 ? '#fff' : '#94A3B8', 
                    background: i === 0 ? 'rgba(255,255,255,0.1)' : 'transparent', 
                    marginBottom: 8, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 12,
                    cursor: 'pointer',
                    transition: 'all 200ms'
                  }}
                  onMouseEnter={e => { if (i !== 0) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; } }}
                  onMouseLeave={e => { if (i !== 0) { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; } }}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: i===0 ? '#0F7B45' : 'rgba(255,255,255,0.1)' }} />
                    {item}
                  </div>
                ))}
              </div>

              {/* Main Content Area */}
              <div style={{ flex: 1, padding: '40px', background: '#FAFAFA', overflow: 'hidden', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                  <div>
                    <h2 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: '0 0 8px' }}>Command Center</h2>
                    <p style={{ margin: 0, color: '#64748B', fontSize: 16, fontWeight: 500 }}>Enterprise Overview & Approvals</p>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ background: '#fff', padding: '12px 20px', borderRadius: 12, border: '1px solid #E2E8F0', fontSize: 15, color: '#64748B', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                      <Search style={{ width: 18, height: 18 }} /> Search everything... <span style={{ background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, fontSize: 12, fontWeight: 700, color: '#0F172A' }}>⌘K</span>
                    </div>
                    <div style={{ background: '#0F7B45', color: '#fff', padding: '12px 24px', borderRadius: 12, fontSize: 15, fontWeight: 700, boxShadow: '0 4px 12px rgba(15,123,69,0.2)' }}>Create Indent</div>
                  </div>
                </div>
                
                {/* Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
                  {[{ l: 'Total Spend (YTD)', v: '₹14.2Cr', t: '+12.5%', c: '#0F7B45' }, { l: 'Active Indents', v: '142', t: '12 urgent', c: '#D97706' }, { l: 'Pending Approvals', v: '24', t: 'Action needed', c: '#E11D48' }, { l: 'Avg Lead Time', v: '4.2d', t: '-1.1d faster', c: '#2563EB' }].map((k, i) => (
                    <div key={k.l} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 20, padding: '24px', transition: 'transform 300ms, box-shadow 300ms', cursor: 'default', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)'; }}
                    >
                      <div style={{ fontSize: 15, color: '#64748B', marginBottom: 12, fontWeight: 600 }}>{k.l}</div>
                      <div style={{ fontSize: 36, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 12 }}>{k.v}</div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: k.c, fontWeight: 700, background: `${k.c}15`, padding: '4px 10px', borderRadius: 99 }}>
                        {k.t}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table Mockup */}
                <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 20, padding: '0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                  <div style={{ padding: '24px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>Recent Procurements</div>
                    <div style={{ fontSize: 15, color: '#0F7B45', fontWeight: 700, cursor: 'pointer' }}>View All</div>
                  </div>
                  <div style={{ padding: '0 24px' }}>
                    {[
                      { ref: 'PR-2026-4281', amount: '18,000' },
                      { ref: 'PR-2026-7042', amount: '42,000' },
                      { ref: 'PR-2026-2815', amount: '65,000' },
                      { ref: 'PR-2026-9374', amount: '29,000' },
                      { ref: 'PR-2026-5508', amount: '73,000' },
                    ].map(({ ref, amount }, idx) => {
                      const i = idx + 1;
                      return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr', alignItems: 'center', padding: '20px 0', borderBottom: i === 5 ? 'none' : '1px solid #F1F5F9', transition: 'background 200ms', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <div style={{ color: '#0F172A', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{ref}</div>
                          <div style={{ color: '#64748B', fontSize: 13, fontWeight: 500 }}>Mechanical Dept.</div>
                        </div>
                        <div style={{ color: '#334155', fontSize: 15, fontWeight: 500 }}>Bearing Assembly Unit 6205...</div>
                        <div style={{ color: '#0F172A', fontSize: 15, fontWeight: 700 }}>₹{amount}</div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'inline-block', background: i % 3 === 0 ? '#FFFBEB' : i % 2 === 0 ? '#EFF6FF' : '#F0FDF4', color: i % 3 === 0 ? '#B45309' : i % 2 === 0 ? '#1D4ED8' : '#15803D', padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 800, letterSpacing: '0.02em' }}>
                            {i % 3 === 0 ? 'APPROVAL PENDING' : i % 2 === 0 ? 'RFQ GENERATED' : 'PO RELEASED'}
                          </span>
                        </div>
                      </div>
                    );})}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ━━━━━━━ ONE UNIFIED WORKSPACE (SPLIT LAYOUT) ━━━━━━━ */}
      <Section id="platform">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 100, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#0F7B45', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 24 }}>
              <Layers style={{ width: 16, height: 16 }} /> Platform Architecture
            </div>
            <h2 style={{ fontSize: 'clamp(48px, 5vw, 64px)', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em', margin: '0 0 32px', lineHeight: 1.05 }}>
              All your work.<br />
              <span style={{ color: '#64748B', fontWeight: 400 }}>In one place.</span>
            </h2>
            <p style={{ fontSize: 22, color: '#475569', lineHeight: 1.7, marginBottom: 48, fontWeight: 400 }}>
              Say goodbye to fragmented spreadsheets and endless email chains. IFH One centralizes every procurement stage into a single, highly governed workspace.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 56 }}>
              {[
                { title: 'Automated Routing', desc: 'Workflows transition instantly between departments without manual intervention.' },
                { title: 'Live Budget Tracking', desc: 'Real-time financial visibility prevents overspending before it happens.' },
                { title: 'Immutable Audit Logs', desc: 'Every action, approval, and rejection is tracked permanently for perfect compliance.' }
              ].map(benefit => (
                <div key={benefit.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E8F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
                    <CheckCircle style={{ width: 16, height: 16, color: '#0F7B45' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, color: '#0F172A', fontWeight: 700, marginBottom: 4 }}>{benefit.title}</div>
                    <div style={{ fontSize: 16, color: '#64748B', lineHeight: 1.5 }}>{benefit.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Abstract UI Representation (ClickUp Style) */}
          <div style={{ position: 'relative', height: 700 }}>
            {/* Soft background shape */}
            <div style={{ position: 'absolute', top: 40, right: 0, bottom: 40, left: 40, background: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)', borderRadius: 40, border: '1px solid #E2E8F0', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5)' }} />
            
            {/* Floating Card 1 */}
            <div style={{ position: 'absolute', top: 80, left: -20, background: '#fff', padding: 32, borderRadius: 24, boxShadow: '0 30px 60px rgba(0,0,0,0.08)', border: '1px solid #E2E8F0', width: 380, zIndex: 3, transition: 'transform 300ms', cursor: 'default' }}
                 onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'}
                 onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0) scale(1)'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#0F7B45', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle style={{ width: 24, height: 24, color: '#fff' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#0F7B45', background: '#DCFCE7', padding: '6px 12px', borderRadius: 99, letterSpacing: '0.05em' }}>JUST NOW</span>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 8, letterSpacing: '-0.01em' }}>Purchase Order Approved</div>
              <div style={{ fontSize: 15, color: '#64748B', fontWeight: 500 }}>Approved by Managing Director</div>
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #F1F5F9', display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, height: 8, background: '#0F7B45', borderRadius: 4 }} />
                <div style={{ flex: 1, height: 8, background: '#0F7B45', borderRadius: 4 }} />
                <div style={{ flex: 1, height: 8, background: '#E2E8F0', borderRadius: 4 }} />
              </div>
            </div>

            {/* Floating Card 2 */}
            <div style={{ position: 'absolute', top: 280, right: -20, background: '#fff', padding: 32, borderRadius: 24, boxShadow: '0 40px 80px rgba(0,0,0,0.12)', border: '1px solid #E2E8F0', width: 420, zIndex: 4, transition: 'transform 300ms', cursor: 'default' }}
                 onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'}
                 onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0) scale(1)'}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>Budget Utilization</div>
                <Activity style={{ width: 20, height: 20, color: '#64748B' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140 }}>
                {[30, 45, 25, 60, 40, 80, 55, 95].map((h, i) => (
                  <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 7 ? '#3B82F6' : '#E2E8F0', borderRadius: 6 }} />
                ))}
              </div>
            </div>

             {/* Floating Card 3 */}
             <div style={{ position: 'absolute', bottom: 100, left: 20, background: '#fff', padding: 24, borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0', width: 340, zIndex: 2, transition: 'transform 300ms', cursor: 'default' }}
                 onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'}
                 onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0) scale(1)'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users style={{ width: 24, height: 24, color: '#64748B' }} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4, letterSpacing: '-0.01em' }}>Vendor Response</div>
                  <div style={{ fontSize: 14, color: '#64748B', fontWeight: 500 }}>3 new RFQ quotations</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ━━━━━━━ WORKFLOW STORY ━━━━━━━ */}
      <Section id="workflow" style={{ background: '#0F172A', color: '#fff', maxWidth: '100%', borderRadius: 0, padding: '160px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 120 }}>
            <h2 style={{ fontSize: 'clamp(48px, 5vw, 64px)', fontWeight: 800, color: '#fff', letterSpacing: '-0.04em', margin: '0 0 24px' }}>Governed by design.</h2>
            <p style={{ fontSize: 22, color: '#94A3B8', maxWidth: 800, margin: '0 auto', lineHeight: 1.6, fontWeight: 400 }}>
              A flawless, connected experience mapping the entire procurement lifecycle. From the moment an indent is raised to the final payment dispatch.
            </p>
          </div>
          
          <div style={{ position: 'relative', padding: '0 40px' }}>
            {/* Curvy Connecting SVG Line */}
            <svg style={{ position: 'absolute', top: 40, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }} viewBox="0 0 1400 400" preserveAspectRatio="none">
              <path d="M 100,40 C 300,40 300,160 500,160 C 700,160 700,-40 900,-40 C 1100,-40 1100,80 1300,80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" strokeLinecap="round" />
            </svg>

            <div style={{ position: 'relative', height: 400, zIndex: 2 }}>
              {workflowSteps.map((step, i) => (
                <div key={i} style={{ 
                  position: 'absolute',
                  left: `${(i / (workflowSteps.length - 1)) * 90}%`,
                  top: `calc(100px + ${step.y}px)`,
                  transform: 'translateX(-50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', width: 140, cursor: 'default' 
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget.querySelector('.workflow-card') as HTMLElement;
                    if(el) { el.style.transform = 'translateY(-12px) scale(1.1)'; el.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)'; }
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget.querySelector('.workflow-card') as HTMLElement;
                    if(el) { el.style.transform = 'translateY(0) scale(1)'; el.style.boxShadow = 'none'; }
                  }}
                >
                  <div style={{ 
                    width: 72, height: 72, borderRadius: 24, 
                    background: step.status === 'done' ? '#0F7B45' : step.status === 'active' ? '#3B82F6' : '#1E293B', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    marginBottom: 20,
                    transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: step.status === 'active' ? '0 0 0 8px rgba(59, 130, 246, 0.2)' : '0 10px 20px rgba(0,0,0,0.2)'
                  }} className="workflow-card">
                    <step.icon style={{ width: 28, height: 28, color: '#fff' }} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: step.status === 'pending' ? '#64748B' : '#fff', textAlign: 'center', lineHeight: 1.2, letterSpacing: '-0.01em' }}>{step.label}</div>
                  {step.status === 'active' && <div style={{ fontSize: 11, fontWeight: 800, color: '#60A5FA', marginTop: 12, letterSpacing: '0.05em' }}>CURRENT</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ━━━━━━━ ENTERPRISE SEARCH SHOWCASE ━━━━━━━ */}
      <Section id="search">
        <div style={{ textAlign: 'center', marginBottom: 80, maxWidth: 800, margin: '0 auto 80px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#3B82F6', fontWeight: 700, fontSize: 14, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 24 }}>
            <SearchCode style={{ width: 16, height: 16 }} /> Global Search
          </div>
          <h2 style={{ fontSize: 'clamp(48px, 5vw, 64px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em', margin: '0 0 24px', lineHeight: 1.1 }}>Find anything.<br />Instantly.</h2>
          <p style={{ fontSize: 22, color: '#64748B', lineHeight: 1.6 }}>
            A powerful, intelligent search engine that indexes your entire procurement ecosystem. From SKUs to specific vendor invoices.
          </p>
        </div>

        <div style={{ maxWidth: 1000, margin: '0 auto', background: '#fff', borderRadius: 32, border: '1px solid #E2E8F0', boxShadow: '0 50px 100px rgba(15, 23, 42, 0.1)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '32px 40px', borderBottom: '1px solid #F1F5F9' }}>
            <Search style={{ width: 28, height: 28, color: '#0F172A' }} />
            <span style={{ fontSize: 24, color: '#0F172A', fontWeight: 600 }}>6205 Bearing...</span>
            <span style={{ marginLeft: 'auto', background: '#F8FAFC', padding: '8px 16px', borderRadius: 12, fontSize: 16, color: '#64748B', fontWeight: 700, border: '1px solid #E2E8F0' }}>⌘ K</span>
          </div>
          
          <div style={{ display: 'flex', height: 480 }}>
            {/* Search Categories */}
            <div style={{ width: 260, borderRight: '1px solid #F1F5F9', padding: '24px 0', background: '#FAFAFA' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', padding: '8px 32px', letterSpacing: '0.05em', marginBottom: 8 }}>Categories</div>
              {['All Results', 'Items & SKUs', 'Vendors', 'Projects', 'Purchase Orders'].map((c, i) => (
                <div key={c} style={{ padding: '14px 32px', fontSize: 16, fontWeight: 600, color: i === 1 ? '#0F172A' : '#64748B', background: i === 1 ? '#fff' : 'transparent', borderLeft: i === 1 ? '4px solid #0F7B45' : '4px solid transparent', cursor: 'pointer', boxShadow: i === 1 ? '0 4px 12px rgba(0,0,0,0.02)' : 'none' }}>
                  {c}
                </div>
              ))}
            </div>
            
            {/* Search Results */}
            <div style={{ flex: 1, padding: '32px', overflowY: 'auto', background: '#fff' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', padding: '0 0 20px', letterSpacing: '0.05em' }}>Items Found (4)</div>
              {[
                { title: 'SKU-2847 — Bearing Assembly 6205-2RS', desc: 'Mechanical • In Stock: 45' },
                { title: 'SKU-3102 — Deep Groove Ball Bearing 6205', desc: 'Electrical • In Stock: 12' },
                { title: 'SKU-1593 — Bearing Housing Assembly Unit', desc: 'Maintenance • In Stock: 0' },
              ].map((r, i) => (
                <div key={i} style={{ padding: '20px', borderRadius: 16, background: i === 0 ? '#F8FAFC' : 'transparent', border: i === 0 ? '1px solid #E2E8F0' : '1px solid transparent', display: 'flex', alignItems: 'center', gap: 20, cursor: 'pointer', transition: 'all 200ms' }}
                  onMouseEnter={e => { if(i !== 0) e.currentTarget.style.background = '#FAFAFA' }}
                  onMouseLeave={e => { if(i !== 0) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fff', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                    <Package style={{ width: 24, height: 24, color: '#0F7B45' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>{r.title}</div>
                    <div style={{ fontSize: 15, color: '#64748B', fontWeight: 500 }}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ━━━━━━━ PLATFORM MODULES ━━━━━━━ */}
      <Section id="modules" style={{ background: '#FAFAFA', maxWidth: '100%', borderRadius: 40, padding: '160px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 100 }}>
            <h2 style={{ fontSize: 'clamp(48px, 5vw, 64px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em', margin: '0 0 16px' }}>Features that scale.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 40 }}>
            {modules.map(m => (
              <div key={m.title} style={{ padding: 48, background: '#fff', borderRadius: 32, border: '1px solid #E2E8F0', transition: 'all 400ms cubic-bezier(0.16, 1, 0.3, 1)', cursor: 'default' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.boxShadow = '0 30px 60px rgba(15, 23, 42, 0.08)'; e.currentTarget.style.transform = 'translateY(-8px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: 64, height: 64, borderRadius: 20, background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
                  <m.icon style={{ width: 32, height: 32, color: m.color }} />
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginBottom: 16, letterSpacing: '-0.02em' }}>{m.title}</div>
                <div style={{ fontSize: 18, color: '#64748B', lineHeight: 1.6 }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ━━━━━━━ FINAL CTA ━━━━━━━ */}
      <Section style={{ padding: '200px 24px', maxWidth: '100%' }}>
        <div style={{ 
          background: '#0F172A', 
          padding: '140px 40px', 
          textAlign: 'center', 
          borderRadius: 48,
          position: 'relative',
          overflow: 'hidden',
          maxWidth: 1400,
          margin: '0 auto',
          boxShadow: '0 50px 100px rgba(15, 23, 42, 0.2)'
        }}>
          {/* Vibrant Gradient Glows (ClickUp/Linear style) */}
          <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '70%', height: '200%', background: 'radial-gradient(ellipse, rgba(16, 185, 129, 0.25) 0%, transparent 60%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', bottom: '-50%', right: '-20%', width: '70%', height: '200%', background: 'radial-gradient(ellipse, rgba(59, 130, 246, 0.2) 0%, transparent 60%)', pointerEvents: 'none', filter: 'blur(40px)' }} />

          <div style={{ position: 'relative', zIndex: 10 }}>
            <h2 style={{ fontSize: 'clamp(64px, 8vw, 96px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.05em', margin: '0 0 32px', lineHeight: 1.05 }}>
              Ready to build.
            </h2>
            <p style={{ fontSize: 26, color: '#94A3B8', maxWidth: 650, margin: '0 auto 64px', lineHeight: 1.6, fontWeight: 400 }}>
              Experience the future of enterprise procurement today.
            </p>
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#fff', color: '#0F172A', padding: '24px 56px', borderRadius: 20, fontSize: 20, fontWeight: 800, textDecoration: 'none', transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 20px 40px rgba(255,255,255,0.15)' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'; e.currentTarget.style.boxShadow = '0 30px 60px rgba(255,255,255,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(255,255,255,0.15)'; }}
              >Sign In <ArrowRight style={{ width: 24, height: 24 }} /></Link>
              <Link href="/indents/new" onClick={handleCreateIndent} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '24px 56px', borderRadius: 20, fontSize: 20, fontWeight: 700, textDecoration: 'none', transition: 'all 300ms cubic-bezier(0.16, 1, 0.3, 1)', backdropFilter: 'blur(10px)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >Create Indent</Link>
            </div>
            <div style={{ marginTop: 64 }}>
              <a href="mailto:admin@if-himenviro.in" style={{ color: '#94A3B8', textDecoration: 'none', fontSize: 16, fontWeight: 600, transition: 'color 200ms' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
              >Contact Administrator</a>
            </div>
          </div>
        </div>
      </Section>

      {/* ━━━━━━━ FOOTER ━━━━━━━ */}
      <footer style={{ background: '#fff', borderTop: '1px solid #E2E8F0', padding: '100px 24px 60px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 80, marginBottom: 100 }}>
            {/* Company */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#0F7B45', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(15, 123, 69, 0.2)' }}>
                  <Layers style={{ width: 20, height: 20, color: '#fff' }} />
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em' }}>IFH One</div>
              </div>
              <p style={{ fontSize: 16, color: '#64748B', lineHeight: 1.8, margin: 0, maxWidth: 360, fontWeight: 500 }}>
                Enterprise procurement management and workflow automation platform for Intensiv-Filter Himenviro.
              </p>
            </div>
            {/* Platform */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 32, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Platform</div>
              {['Workflow', 'Search', 'Modules', 'Security'].map(l => (
                <a key={l} href={`#${l.toLowerCase()}`} style={{ display: 'block', fontSize: 16, color: '#64748B', fontWeight: 600, textDecoration: 'none', padding: '10px 0', transition: 'color 200ms' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#0F172A')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
                >{l}</a>
              ))}
            </div>
            {/* Support */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 32, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Support</div>
              {[{ l: 'Contact Admin', h: 'mailto:admin@if-himenviro.in' }, { l: 'Sign In', h: '/login' }, { l: 'Create Indent', h: '/indents/new' }].map(l => (
                <a key={l.l} href={l.h} style={{ display: 'block', fontSize: 16, color: '#64748B', fontWeight: 600, textDecoration: 'none', padding: '10px 0', transition: 'color 200ms' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#0F172A')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
                >{l.l}</a>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
            <span style={{ fontSize: 15, color: '#94A3B8', fontWeight: 600 }}>© 2026 Intensiv-Filter Himenviro Pvt. Ltd.</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 16px rgba(16, 185, 129, 0.6)' }} />
              <span style={{ fontSize: 15, color: '#64748B', fontWeight: 700 }}>All Systems Operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
