'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Shield, KeyRound, FolderKanban,
  Truck, Package, FileText, Send, ShoppingCart, Receipt, ClipboardCheck,
  CreditCard, Wallet, BarChart3, Settings, User, LogOut,
  ChevronRight, Layers, AlertCircle, Archive, TrendingUp, CheckCircle2,
  Zap, Bell, ClipboardList, Monitor
} from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IconType = React.ComponentType<any>;

interface NavItem {
  label: string;
  href: string;
  icon: IconType;
  badge?: number;
  stageNum?: number;
  permKey?: string; // permission key required to see this item
}

interface NavGroup {
  title: string;
  items: NavItem[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
  permKey?: string; // if set, whole group hidden unless can(permKey)
}

// Mobile sidebar context — shared with TopHeader via custom event
export function openMobileSidebar() { window.dispatchEvent(new Event('sidebar:open')); }

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { can, isSuperAdmin, getViewableStages } = usePermission();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Procurement Workflow']);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Compute viewable stages once (avoids re-computing per item)
  const viewableStages = getViewableStages();

  // Listen for open event from TopHeader hamburger
  useEffect(() => {
    const handler = () => setMobileOpen(true);
    window.addEventListener('sidebar:open', handler);
    return () => window.removeEventListener('sidebar:open', handler);
  }, []);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const navGroups: NavGroup[] = [
    {
      title: '',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permKey: 'dashboard.view' },
      ],
    },
    {
      title: 'Command Center',
      items: [
        { label: 'Control Tower', href: '/control-tower', icon: Monitor, permKey: 'dashboard.view' },
        { label: 'Indent Lifecycle', href: '/indent-lifecycle', icon: TrendingUp, permKey: 'indent.view' },
        { label: 'Pending & Delays', href: '/pending-delays', icon: AlertCircle, permKey: 'dashboard.view' },
      ],
    },
    {
      title: 'Administration',
      permKey: 'user.view',
      items: [
        { label: 'Users', href: '/users', icon: Users, permKey: 'user.view' },
        { label: 'Roles', href: '/roles', icon: Shield, permKey: 'role.view' },
        { label: 'Permissions', href: '/permissions', icon: KeyRound, permKey: 'permission.view' },
      ],
    },
    {
      title: 'Master Data',
      items: [
        { label: 'Projects', href: '/projects', icon: FolderKanban, permKey: 'master.projects' },
        { label: 'Vendors', href: '/vendors', icon: Truck, permKey: 'master.view' },
        { label: 'Items', href: '/items', icon: Package, permKey: 'master.items' },
      ],
    },
    {
      title: 'Procurement Workflow',
      collapsible: true,
      defaultExpanded: true,
      items: [
        { label: 'Indent Creation',       href: '/indents',                        icon: FileText,       stageNum: 0,  permKey: 'indent.create' },
        { label: 'Indent Verification',   href: '/indent-verification',            icon: CheckCircle2,   stageNum: 1,  permKey: 'workflow.stage1.view' },
        { label: 'Store Check',           href: '/store-check',                    icon: Package,        stageNum: 2,  permKey: 'workflow.stage2.view' },
        { label: 'RFQ Float',             href: '/rfq-float',                      icon: Send,           stageNum: 3,  permKey: 'workflow.stage3.view' },
        { label: 'Techno-Comm Eval',      href: '/techno-commercial-evaluation',   icon: TrendingUp,     stageNum: 4,  permKey: 'workflow.stage4.view' },
        { label: 'Negotiation',           href: '/negotiation',                    icon: Zap,            stageNum: 5,  permKey: 'workflow.stage5.view' },
        { label: 'Purchase Orders',       href: '/purchase-orders',               icon: ShoppingCart,   stageNum: 6,  permKey: 'workflow.stage6.view' },
        { label: 'PO Approval L1',        href: '/po-approval-l1',                icon: CheckCircle2,   stageNum: 7,  permKey: 'workflow.stage7.view' },
        { label: 'PO Approval L2',        href: '/po-approval-l2',                icon: CheckCircle2,   stageNum: 8,  permKey: 'workflow.stage8.view' },
        { label: 'Vendor Acceptance',     href: '/vendor-acceptance',             icon: Users,          stageNum: 9,  permKey: 'workflow.stage9.view' },
        { label: 'Vendor Follow-Up',      href: '/vendor-follow-up',              icon: Bell,           stageNum: 10, permKey: 'workflow.stage10.view' },
        { label: 'Material Receipt',      href: '/material-receipt',              icon: Receipt,        stageNum: 11, permKey: 'workflow.stage11.view' },
        { label: 'Gate Entry',            href: '/gate-entry',                    icon: Truck,          permKey: 'gate_entry.view' },
        { label: 'Material Inspection',   href: '/material-inspection',           icon: ClipboardCheck, stageNum: 12, permKey: 'workflow.stage12.view' },
        { label: 'Secondary Inspection',  href: '/secondary-inspection',          icon: ClipboardList,  stageNum: 13, permKey: 'workflow.stage13.view' },
        { label: 'Final Inspection',      href: '/final-inspection',              icon: CheckCircle2,   stageNum: 14, permKey: 'workflow.stage14.view' },
        { label: 'Debit Note',            href: '/debit-note',                    icon: FileText,       stageNum: 15, permKey: 'workflow.stage15.view' },
        { label: 'Bill to Accounts',      href: '/bill-to-accounts',              icon: CreditCard,     stageNum: 16, permKey: 'workflow.stage16.view' },
        { label: 'Bill to Purchase',      href: '/bill-to-purchase',              icon: CreditCard,     stageNum: 17, permKey: 'workflow.stage17.view' },
        { label: 'Bill Creation',         href: '/bill-creation',                 icon: FileText,       stageNum: 18, permKey: 'workflow.stage18.view' },
        { label: 'Tally Entry',           href: '/tally-entry',                   icon: BarChart3,      stageNum: 19, permKey: 'workflow.stage19.view' },
        { label: 'Bill Approval L1',      href: '/bill-approval-l1',              icon: CheckCircle2,   stageNum: 20, permKey: 'workflow.stage20.view' },
        { label: 'Bill Approval L2',      href: '/bill-approval-l2',              icon: CheckCircle2,   stageNum: 21, permKey: 'workflow.stage21.view' },
        { label: 'Payment Advice',        href: '/payment-advice',               icon: Wallet,         stageNum: 22, permKey: 'workflow.stage22.view' },
      ],
    },
    {
      title: 'Workflow Management',
      items: [
        { label: 'Hold Records',     href: '/hold-records',     icon: AlertCircle, permKey: 'indent.view' },
        { label: 'Rejected Records', href: '/rejected-records', icon: AlertCircle, permKey: 'indent.view' },
        { label: 'Archived Indents', href: '/archived-indents', icon: Archive, permKey: 'indent.view' },
        { label: 'Notifications',    href: '/notifications',    icon: Bell, permKey: 'notification.view' },
        { label: 'Audit Trail',      href: '/audit-trail',      icon: FileText, permKey: 'audit.view' },
      ],
    },
  ];

  const sidebarContent = (
    <>
      {/* Logo bar */}
      <div
        className="flex items-center flex-shrink-0"
        style={{ height: 'var(--topbar-h)', padding: '0 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between' }}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden min-w-0">
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-lg"
            style={{ width: 34, height: 34, background: 'var(--primary)' }}
          >
            <Layers className="text-white" style={{ width: 17, height: 17 }} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-white leading-none font-bold" style={{ fontFamily: 'var(--font-display)', fontSize: 15, letterSpacing: '-0.01em' }}>IFH One</span>
            <span className="text-white/50 mt-0.5" style={{ fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700 }}>Procurement ERP</span>
          </div>
        </Link>
        {/* Close button on mobile */}
        <button onClick={() => setMobileOpen(false)} className="lg:hidden" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '4px 8px', fontSize: 16, lineHeight: 1 }}>✕</button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '8px 10px', scrollbarWidth: 'none' }}>
        {navGroups.map((group, gi) => {
          // Filter items by permission
          const visibleItems = isSuperAdmin
            ? group.items
            : group.items.filter(item => {
                // Workflow items: check viewableStages for stageNum > 0
                if (item.stageNum !== undefined && item.stageNum > 0) {
                  return viewableStages.includes(item.stageNum);
                }
                // Non-workflow items: check permKey as before
                return !item.permKey || can(item.permKey);
              });
          // Hide entire group if no visible items, or group permKey not allowed
          if (visibleItems.length === 0) return null;
          if (group.permKey && !isSuperAdmin && !can(group.permKey)) return null;

          const isExpanded = group.collapsible ? expandedGroups.includes(group.title) : true;
          return (
            <div key={gi} style={{ marginTop: gi > 0 ? 16 : 0 }}>
              {group.title && (
                <div className="flex items-center justify-between" style={{ padding: '0 8px', marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{group.title}</span>
                  {group.collapsible && (
                    <button onClick={() => toggleGroup(group.title)} style={{ color: 'rgba(255,255,255,0.3)', padding: 2 }} className="transition-colors hover:text-white/60">
                      <ChevronRight style={{ width: 11, height: 11, transition: 'transform 150ms', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
                    </button>
                  )}
                </div>
              )}
              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {visibleItems.map((item) => {
                    const isActive = item.href === '/dashboard' ? pathname === '/dashboard' : item.href !== '/indent-lifecycle' ? pathname === item.href || (item.href !== '/indents' && pathname.startsWith(item.href + '/')) : pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        onClick={() => { router.push(item.href); setMobileOpen(false); }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', justifyContent: 'flex-start', borderRadius: 8, background: isActive ? 'var(--sidebar-active-bg)' : 'transparent', color: isActive ? 'var(--sidebar-active-text)' : 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: isActive ? 600 : 500, transition: 'all 0.15s ease', cursor: 'pointer', border: 'none', textAlign: 'left', position: 'relative' }}
                        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--sidebar-hover)'; e.currentTarget.style.color = '#FFFFFF'; } }}
                        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; } }}
                      >
                        {isActive && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 18, borderRadius: '0 3px 3px 0', background: 'var(--sidebar-active-text)' }} />}
                        <Icon className="flex-shrink-0" style={{ width: 15, height: 15, color: isActive ? '#4ADE80' : 'rgba(255,255,255,0.5)' }} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.stageNum !== undefined && <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? '#4ADE80' : 'rgba(255,255,255,0.25)', letterSpacing: '0.02em', flexShrink: 0 }}>S{item.stageNum}</span>}
                        {item.badge !== undefined && item.badge > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', background: 'rgba(74,222,128,0.18)', color: '#4ADE80', borderRadius: 99, flexShrink: 0 }}>{item.badge}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 10px 12px' }}>
        <button onClick={() => { router.push('/profile'); setMobileOpen(false); }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', justifyContent: 'flex-start', borderRadius: 8, background: pathname.startsWith('/profile') ? 'var(--sidebar-active-bg)' : 'transparent', color: 'rgba(255,255,255,0.65)', fontSize: 13, cursor: 'pointer', border: 'none', transition: 'all 0.15s ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--sidebar-hover)'; e.currentTarget.style.color = '#FFFFFF'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}>
          <User style={{ width: 15, height: 15, flexShrink: 0 }} />
          <span>Profile</span>
        </button>
        <button disabled style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', justifyContent: 'flex-start', borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.25)', fontSize: 12, cursor: 'not-allowed', border: 'none', opacity: 0.6 }}>
          <LogOut style={{ width: 15, height: 15, flexShrink: 0 }} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside
        className="fixed top-0 left-0 z-40 h-screen flex-col hidden lg:flex"
        style={{
          width: '268px',
          backgroundColor: 'var(--sidebar-bg)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" style={{ display: 'flex' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.55)' }} onClick={() => setMobileOpen(false)} />
          <aside
            style={{ width: 268, backgroundColor: 'var(--sidebar-bg)', borderLeft: '1px solid rgba(255,255,255,0.06)', height: '100vh', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
