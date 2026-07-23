'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  User as UserIcon, Building, Shield, Activity, LifeBuoy, Settings,
  Lock, Monitor, CheckCircle, PieChart, Star, LogOut, Check, Save, Image as ImageIcon, Briefcase
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api/fetch';
import { PageHeader } from '@/components/ui/page-header';

const ProfileCharts = dynamic(() => import('@/components/profile/ProfileCharts'), {
  ssr: false,
  loading: () => <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 13 }}>Loading charts…</div>,
});

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any>({ roles: [], permissions: [] });
  const [activity, setActivity] = useState<any[]>([]);
  const [charts, setCharts] = useState<any>(null);
  const [achievements, setAchievements] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [prefs, setPrefs] = useState({ theme: 'light', language: 'en', defaultDashboard: 'overview' });
  
  const [profileForm, setProfileForm] = useState({
    name: '', phone: '', alternatePhone: '', dateOfBirth: '', gender: '',
    address: '', city: '', state: '', country: '', postalCode: '', profileImage: ''
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        alternatePhone: user.alternatePhone || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        gender: user.gender || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        country: user.country || '',
        postalCode: user.postalCode || '',
        profileImage: user.profileImage || ''
      });
      loadAll();
    }
  }, [user]);

  async function loadAll() {
    try {
      setLoading(true);
      const [st, ac, an, sess, perm, ch, ach] = await Promise.all([
        apiFetch(`/users/${user?.id}/statistics`),
        apiFetch(`/users/${user?.id}/activity`),
        apiFetch(`/users/${user?.id}/analytics`).catch(() => ({})),
        apiFetch(`/users/${user?.id}/sessions`).catch(() => []),
        apiFetch(`/users/${user?.id}/permissions`).catch(() => ({ roles: [], permissions: [] })),
        apiFetch(`/users/${user?.id}/charts`).catch(() => null),
        apiFetch(`/users/${user?.id}/achievements`).catch(() => null)
      ]);
      setStats(st);
      setActivity(ac || []);
      setAnalytics(an);
      setSessions(sess);
      setPermissions(perm);
      setCharts(ch);
      setAchievements(ach);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/users/${user?.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: profileForm.name,
          phone: profileForm.phone,
          alternatePhone: profileForm.alternatePhone,
          dateOfBirth: profileForm.dateOfBirth ? new Date(profileForm.dateOfBirth).toISOString() : null,
          gender: profileForm.gender,
          address: profileForm.address,
          city: profileForm.city,
          state: profileForm.state,
          country: profileForm.country,
          postalCode: profileForm.postalCode,
          profileImage: profileForm.profileImage
        })
      });
      alert('Profile updated successfully.');
      if (refreshUser) refreshUser();
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) return alert("Passwords don't match");
    if (passForm.newPassword.length < 8) return alert("Password must be at least 8 characters");
    
    setSaving(true);
    try {
      await apiFetch(`/users/${user?.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword })
      });
      alert('Password updated successfully. Please login again.');
      logout();
    } catch(e: any) {
      alert(e.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  }

  async function revokeSession(sessionId: string) {
    if (!confirm('Are you sure you want to log out of this session?')) return;
    try {
      await apiFetch(`/users/${user?.id}/sessions/${sessionId}`, { method: 'DELETE' });
      await loadAll();
    } catch(e) {
      alert('Failed to revoke session');
    }
  }

  async function savePreferences() {
    setSaving(true);
    try {
      await apiFetch(`/users/${user?.id}/preferences`, {
        method: 'PATCH',
        body: JSON.stringify(prefs)
      });
      alert('Preferences saved');
    } catch(e) {
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }

  if (loading && !stats) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading account center...</div>;
  if (!user) return null;

  return (
    <div className="page-content" style={{ paddingBottom: 60 }}>
      <PageHeader
        title="Account Center"
        description="Manage your profile, security, preferences, and view your workload analytics."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24, marginTop: 24 }}>
        
        {/* SIDEBAR NAVIGATION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { id: 'overview', icon: PieChart, label: 'Analytics & Overview' },
            { id: 'charts', icon: Activity, label: 'Advanced Charts' },
            { id: 'personal', icon: UserIcon, label: 'Personal Information' },
            { id: 'organization', icon: Building, label: 'Organization Info' },
            { id: 'security', icon: Lock, label: 'Security Center' },
            { id: 'permissions', icon: Shield, label: 'My Permissions' },
            { id: 'approvals', icon: CheckCircle, label: 'My Approvals' },
            { id: 'activity', icon: Activity, label: 'Activity Timeline' },
            { id: 'preferences', icon: Settings, label: 'Preferences' },
            { id: 'support', icon: LifeBuoy, label: 'Support & Help' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 8,
                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'var(--text-primary)',
                border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 500,
                transition: 'all 0.2s'
              }}>
              <tab.icon style={{ width: 18, height: 18, color: activeTab === tab.id ? '#fff' : 'var(--text-muted)' }} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="ifh-card" style={{ minHeight: 600, padding: 24 }}>
          
          {/* TAB: OVERVIEW & ANALYTICS */}
          {activeTab === 'overview' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
                {user.profileImage ? (
                  <img src={user.profileImage} alt="Avatar" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {user.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</h2>
                  <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
                    {user.designation || 'Staff'} • {user.Department?.name || 'No Department'}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(15,123,69,0.1)', color: 'var(--primary)' }}>
                      ID: {user.employeeId || '—'}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#F3F4F6', color: '#4B5563' }}>
                      Joined {user.createdAt ? new Date(user.createdAt).getFullYear() : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Workload & Quick Statistics</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
                <div style={{ padding: 16, background: 'var(--background)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Pending Approvals</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>{stats?.pendingApprovals || 0}</div>
                </div>
                <div style={{ padding: 16, background: 'var(--background)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Projects Assigned</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{stats?.projectsAssigned || 0}</div>
                </div>
                <div style={{ padding: 16, background: 'var(--background)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Indents Created</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>{stats?.indentsCreated || 0}</div>
                </div>
                <div style={{ padding: 16, background: 'var(--background)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>SLA Compliance</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>{analytics?.slaCompliance || 0}%</div>
                </div>
              </div>

              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Milestones & Badges</h3>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#FEF3C7', borderRadius: 8, border: '1px solid #FDE68A' }}>
                  <Star style={{ width: 24, height: 24, color: '#D97706', fill: '#F59E0B' }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>First Login</div>
                    <div style={{ fontSize: 11, color: '#B45309' }}>Achieved</div>
                  </div>
                </div>
                {(stats?.indentsApproved || 0) >= 100 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#E0E7FF', borderRadius: 8, border: '1px solid #C7D2FE' }}>
                    <Shield style={{ width: 24, height: 24, color: '#4338CA', fill: '#6366F1' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#3730A3' }}>100 Approvals Club</div>
                      <div style={{ fontSize: 11, color: '#4F46E5' }}>Achieved</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          
          {/* TAB: CHARTS */}
          {activeTab === 'charts' && <ProfileCharts charts={charts} />}


          {/* TAB: PERSONAL INFORMATION CRUD */}
          {activeTab === 'personal' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>Personal Information</h2>
              <form onSubmit={handleProfileSave} style={{ display: 'grid', gap: 24, maxWidth: 700 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="ifh-label">Full Name</label>
                    <input className="ifh-input" value={profileForm.name} onChange={e => setProfileForm(p => ({...p, name: e.target.value}))} required />
                  </div>
                  <div>
                    <label className="ifh-label">Email Address (Read-only)</label>
                    <input className="ifh-input" value={user.email} disabled style={{ background: 'var(--surface2)' }} />
                  </div>
                  <div>
                    <label className="ifh-label">Phone Number</label>
                    <input className="ifh-input" value={profileForm.phone} onChange={e => setProfileForm(p => ({...p, phone: e.target.value}))} />
                  </div>
                  <div>
                    <label className="ifh-label">Alternate Phone</label>
                    <input className="ifh-input" value={profileForm.alternatePhone} onChange={e => setProfileForm(p => ({...p, alternatePhone: e.target.value}))} />
                  </div>
                  <div>
                    <label className="ifh-label">Date of Birth</label>
                    <input type="date" className="ifh-input" value={profileForm.dateOfBirth} onChange={e => setProfileForm(p => ({...p, dateOfBirth: e.target.value}))} />
                  </div>
                  <div>
                    <label className="ifh-label">Gender</label>
                    <select className="ifh-input" value={profileForm.gender} onChange={e => setProfileForm(p => ({...p, gender: e.target.value}))}>
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Address Information</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label className="ifh-label">Address</label>
                      <input className="ifh-input" value={profileForm.address} onChange={e => setProfileForm(p => ({...p, address: e.target.value}))} />
                    </div>
                    <div>
                      <label className="ifh-label">City</label>
                      <input className="ifh-input" value={profileForm.city} onChange={e => setProfileForm(p => ({...p, city: e.target.value}))} />
                    </div>
                    <div>
                      <label className="ifh-label">State</label>
                      <input className="ifh-input" value={profileForm.state} onChange={e => setProfileForm(p => ({...p, state: e.target.value}))} />
                    </div>
                    <div>
                      <label className="ifh-label">Country</label>
                      <input className="ifh-input" value={profileForm.country} onChange={e => setProfileForm(p => ({...p, country: e.target.value}))} />
                    </div>
                    <div>
                      <label className="ifh-label">Postal Code</label>
                      <input className="ifh-input" value={profileForm.postalCode} onChange={e => setProfileForm(p => ({...p, postalCode: e.target.value}))} />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Avatar</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {profileForm.profileImage ? (
                      <img src={profileForm.profileImage} alt="Avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        <ImageIcon style={{ width: 24, height: 24 }} />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <label className="ifh-label">Image URL</label>
                      <input className="ifh-input" placeholder="https://..." value={profileForm.profileImage} onChange={e => setProfileForm(p => ({...p, profileImage: e.target.value}))} />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Paste an image URL to change your avatar.</div>
                    </div>
                  </div>
                </div>

                <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button type="submit" disabled={saving} className="ifh-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Save style={{ width: 16, height: 16 }} /> {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: SECURITY CENTER */}
          {activeTab === 'security' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24 }}>Security Center</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Change Password</h3>
                  <form onSubmit={handlePasswordChange} style={{ display: 'grid', gap: 16 }}>
                    <div>
                      <label className="ifh-label">Current Password</label>
                      <input type="password" required className="ifh-input" value={passForm.currentPassword} onChange={e => setPassForm(p => ({ ...p, currentPassword: e.target.value }))} />
                    </div>
                    <div>
                      <label className="ifh-label">New Password</label>
                      <input type="password" required className="ifh-input" value={passForm.newPassword} onChange={e => setPassForm(p => ({ ...p, newPassword: e.target.value }))} />
                    </div>
                    <div>
                      <label className="ifh-label">Confirm New Password</label>
                      <input type="password" required className="ifh-input" value={passForm.confirmPassword} onChange={e => setPassForm(p => ({ ...p, confirmPassword: e.target.value }))} />
                    </div>
                    <button type="submit" disabled={saving} className="ifh-btn-primary" style={{ width: 'fit-content' }}>
                      {saving ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                  <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Password Health</div>
                    Last changed: {user.passwordChangedAt ? new Date(user.passwordChangedAt).toLocaleDateString() : 'Never'}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Active Sessions</h3>
                  {sessions.length === 0 ? <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No active sessions found.</div> : (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {sessions.map((s, idx) => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Monitor style={{ width: 20, height: 20, color: 'var(--primary)' }} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {s.os || 'Unknown OS'} - {s.browser || 'Unknown Browser'}
                                {idx === 0 && <span style={{ marginLeft: 8, fontSize: 10, background: '#d1fae5', color: '#065f46', padding: '2px 6px', borderRadius: 10 }}>Current</span>}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>IP: {s.ipAddress || 'Unknown'} • Last active: {new Date(s.lastActivity).toLocaleString()}</div>
                            </div>
                          </div>
                          {idx !== 0 && (
                            <button onClick={() => revokeSession(s.id)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }} title="Revoke Session">
                              <LogOut style={{ width: 16, height: 16 }} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {sessions.length > 1 && (
                    <button onClick={() => revokeSession('all')} style={{ marginTop: 16, fontSize: 13, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Log out of all other sessions
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: PERMISSIONS VIEWER */}
          {activeTab === 'permissions' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>My Permissions</h2>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Assigned Roles: </span>
                {permissions.roles.map((r: string) => (
                  <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'rgba(15,123,69,0.1)', color: 'var(--primary)', fontSize: 12, fontWeight: 600, marginLeft: 8 }}>
                    <Shield style={{ width: 12, height: 12 }} /> {r}
                  </span>
                ))}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {permissions.permissions.map((p: any) => (
                  <div key={p.id} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <Check style={{ width: 16, height: 16, color: '#10B981', marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{p.key}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Module: {p.module}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{p.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>User Preferences</h2>
              <div style={{ maxWidth: 500, display: 'grid', gap: 20 }}>
                <div>
                  <label className="ifh-label">Theme</label>
                  <select className="ifh-input" value={prefs.theme} onChange={e => setPrefs(p => ({...p, theme: e.target.value}))}>
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                    <option value="system">System Default</option>
                  </select>
                </div>
                <div>
                  <label className="ifh-label">Language</label>
                  <select className="ifh-input" value={prefs.language} onChange={e => setPrefs(p => ({...p, language: e.target.value}))}>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="fr">French</option>
                  </select>
                </div>
                <div>
                  <label className="ifh-label">Default Dashboard</label>
                  <select className="ifh-input" value={prefs.defaultDashboard} onChange={e => setPrefs(p => ({...p, defaultDashboard: e.target.value}))}>
                    <option value="overview">Overview Analytics</option>
                    <option value="procurement">Procurement Command Center</option>
                    <option value="approvals">My Approvals</option>
                  </select>
                </div>
                <button onClick={savePreferences} disabled={saving} className="ifh-btn-primary" style={{ width: 'fit-content' }}>
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}

          {/* TAB: ACTIVITY TIMELINE */}
          {activeTab === 'activity' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Recent Activity Feed</h2>
              <div style={{ display: 'grid', gap: 16 }}>
                {activity.map((log: any) => (
                  <div key={log.id} style={{ display: 'flex', gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <Activity style={{ width: 18, height: 18 }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{log.action.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: MY APPROVALS */}
          {activeTab === 'approvals' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>My Approvals</h2>
              <div style={{ padding: 40, textAlign: 'center', background: 'var(--surface)', borderRadius: 8 }}>
                <CheckCircle style={{ width: 40, height: 40, color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.5 }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>You're all caught up!</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>There are no items pending your approval right now.</p>
              </div>
            </div>
          )}

          {/* TAB: ORGANIZATION */}
          {activeTab === 'organization' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Organization Info</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600 }}>
                <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Employee ID</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{user.employeeId || '—'}</div>
                </div>
                <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Department</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{user.Department?.name || '—'}</div>
                </div>
                <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Designation</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{user.designation || '—'}</div>
                </div>
                <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Joined</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</div>
                </div>
                <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Company</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{user.company || '—'}</div>
                </div>
                <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Account Status</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#10B981' }}>Active</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUPPORT */}
          {activeTab === 'support' && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Support & Help</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {[
                  { title: 'Help Center', desc: 'Browse FAQs and guides.' },
                  { title: 'Documentation', desc: 'Read the detailed system manual.' },
                  { title: 'Report Bug', desc: 'Submit an issue to IT.' },
                  { title: 'Contact Administrator', desc: 'Request help from your admin.' }
                ].map(item => (
                  <div key={item.title} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', transition: 'border-color 0.2s' }}>
                    <LifeBuoy style={{ width: 24, height: 24, color: 'var(--primary)', marginBottom: 12 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 32, padding: 16, background: 'var(--surface2)', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>System Information</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>IFH One Enterprise ERP</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Version 2.10.0</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
