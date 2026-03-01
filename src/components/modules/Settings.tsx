"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/lib/toast";
import { Icon } from "@/components/ui/Icon";
import { apiClient } from "@/services/apiClient";
import { Tabs, Badge, Modal } from "@/components/ui";

const SYSTEM_ROLES = ["Admin","HR","Accountant","StoreKeeper","WorkshopEngineer","CanteenManager","Employee"];
const DEPARTMENTS   = ["HR","Finance","IT","Operations","Workshop","Inventory","Canteen","Security","Admin","Maintenance"];

function getTabs(role: string) {
  const tabs = [{ id:"profile", label:"My Profile" }, { id:"security", label:"Security" }];
  if (role === 'Admin') {
    tabs.push({ id:"users",    label:"User Accounts" });
    tabs.push({ id:"requests", label:"Registration Requests" });
    tabs.push({ id:"system",   label:"System Settings" });
  }
  return tabs;
}

export default function Settings() {
  const { user, login } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState("profile");
  const [saving, setSaving] = useState(false);

  // Profile refs
  const nameRef  = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const curPassRef = useRef<HTMLInputElement>(null);
  const newPassRef = useRef<HTMLInputElement>(null);
  const confPassRef= useRef<HTMLInputElement>(null);

  // Admin: users
  const [users, setUsers] = useState<any[]>([]);
  const [editUser, setEditUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const euNameRef  = useRef<HTMLInputElement>(null);
  const euEmailRef = useRef<HTMLInputElement>(null);
  const euRoleRef  = useRef<HTMLSelectElement>(null);

  // Admin: register requests
  const [requests, setRequests] = useState<any[]>([]);
  const [reviewReq, setReviewReq] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const reviewRoleRef  = useRef<HTMLSelectElement>(null);
  const reviewNotesRef = useRef<HTMLInputElement>(null);

  // System settings state
  const [schoolName, setSchoolName] = useState("SIOMS School");
  const [timezone,   setTimezone]   = useState("Africa/Cairo");
  const [currency,   setCurrency]   = useState("EGP");
  const [gpsRadius,  setGpsRadius]  = useState("200");
  const [workStart,  setWorkStart]  = useState("08:00");
  const [workEnd,    setWorkEnd]    = useState("16:00");
  const [lateGrace,  setLateGrace]  = useState("15");

  useEffect(() => {
    if (tab === 'users')    fetchUsers();
    if (tab === 'requests') fetchRequests();
  }, [tab]);

  const fetchUsers = async () => {
    try { setUsers(await apiClient.get<any[]>('/auth/users')); }
    catch { toast("Failed to load users","error"); }
  };

  const fetchRequests = async () => {
    try { setRequests(await apiClient.get<any[]>('/auth/register-requests')); }
    catch { toast("Failed to load requests","error"); }
  };

  // ── Profile Update ──
  const handleUpdateProfile = async () => {
    const name  = nameRef.current?.value?.trim();
    const email = emailRef.current?.value?.trim();
    if (!name || name.length < 2) { toast("Name must be at least 2 characters","error"); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast("Valid email required","error"); return; }
    setSaving(true);
    try {
      const updated = await apiClient.put<any>('/auth/profile', { name, email });
      const token = localStorage.getItem('sioms_token') || '';
      login({ ...user!, name: updated.name || name, email: updated.email || email }, token);
      toast("Profile updated","success");
    } catch (e: any) { toast(e.message || "Failed","error"); }
    finally { setSaving(false); }
  };

  // ── Password Change ──
  const handleChangePassword = async () => {
    const current = curPassRef.current?.value;
    const newPass = newPassRef.current?.value;
    const confirm = confPassRef.current?.value;
    if (!current) { toast("Current password required","error"); return; }
    if (!newPass || newPass.length < 6) { toast("New password must be at least 6 chars","error"); return; }
    if (newPass !== confirm) { toast("Passwords do not match","error"); return; }
    setSaving(true);
    try {
      await apiClient.put('/auth/profile', { currentPassword: current, newPassword: newPass });
      toast("Password changed successfully","success");
      if (curPassRef.current) curPassRef.current.value = '';
      if (newPassRef.current) newPassRef.current.value = '';
      if (confPassRef.current) confPassRef.current.value = '';
    } catch (e: any) { toast(e.message || "Failed","error"); }
    finally { setSaving(false); }
  };

  // ── Admin: Edit User ──
  const openEditUser = (u: any) => {
    setEditUser(u);
    setShowUserModal(true);
    setTimeout(() => {
      if (euNameRef.current)  euNameRef.current.value  = u.name;
      if (euEmailRef.current) euEmailRef.current.value = u.email;
      if (euRoleRef.current)  euRoleRef.current.value  = u.role;
    }, 50);
  };

  const handleSaveUser = async () => {
    if (!editUser) return;
    const name  = euNameRef.current?.value?.trim();
    const email = euEmailRef.current?.value?.trim();
    const role  = euRoleRef.current?.value;
    if (!name || name.length < 2) { toast("Name required","error"); return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast("Valid email required","error"); return; }
    try {
      await apiClient.put(`/auth/users/${editUser.id}`, { name, email, role });
      toast("User updated","success");
      setShowUserModal(false); fetchUsers();
    } catch (e: any) { toast(e.message || "Failed","error"); }
  };

  const handleToggleActive = async (u: any) => {
    const action = u.is_active ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${u.name}"?`)) return;
    try {
      await apiClient.put(`/auth/users/${u.id}`, { is_active: !u.is_active });
      toast(`User ${action}d`,"success"); fetchUsers();
    } catch (e: any) { toast(e.message || "Failed","error"); }
  };

  const handleResetPassword = async (u: any) => {
    if (!confirm(`Reset password for "${u.name}"? A new password will be emailed to them.`)) return;
    try {
      await apiClient.put(`/auth/users/${u.id}`, { resetPassword: true });
      toast(`Password reset and sent to ${u.email}`,"success");
    } catch (e: any) { toast(e.message || "Failed","error"); }
  };

  const handleDeleteUser = async (u: any) => {
    if (!confirm(`Permanently delete "${u.name}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/auth/users/${u.id}`);
      toast(`${u.name} deleted`,"success"); fetchUsers();
    } catch (e: any) { toast(e.message || "Failed","error"); }
  };

  // ── Admin: Review Request ──
  const openReviewModal = (req: any) => {
    setReviewReq(req);
    setShowReviewModal(true);
    setTimeout(() => {
      if (reviewRoleRef.current) reviewRoleRef.current.value = req.requested_role;
      if (reviewNotesRef.current) reviewNotesRef.current.value = '';
    }, 50);
  };

  const handleApproveRequest = async () => {
    if (!reviewReq) return;
    const role  = reviewRoleRef.current?.value;
    const notes = reviewNotesRef.current?.value;
    try {
      const result = await apiClient.post<any>(`/auth/register-requests/${reviewReq.id}/approve`, { role, adminNotes: notes });
      toast(`✅ ${reviewReq.name} approved! Credentials sent to ${reviewReq.email}`,"success");
      setShowReviewModal(false); fetchRequests();
    } catch (e: any) { toast(e.message || "Failed","error"); }
  };

  const handleRejectRequest = async () => {
    if (!reviewReq) return;
    if (!confirm(`Reject request from "${reviewReq.name}"?`)) return;
    const notes = reviewNotesRef.current?.value;
    try {
      await apiClient.post(`/auth/register-requests/${reviewReq.id}/reject`, { adminNotes: notes });
      toast("Request rejected","info");
      setShowReviewModal(false); fetchRequests();
    } catch (e: any) { toast(e.message || "Failed","error"); }
  };

  const tabs = getTabs(user?.role || '');
  const pendingRequests = requests.filter(r => r.status === 'Pending' || r.status === 'Verified');

  return (
    <div className="fade-in">
      <Tabs tabs={tabs.map(t => t.id === 'requests' && pendingRequests.length > 0
        ? { ...t, label: `${t.label} (${pendingRequests.length})` } : t
      )} active={tab} onChange={setTab} />

      {/* ── MY PROFILE ── */}
      {tab === "profile" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Personal Information</span></div>
            <div style={{ padding:"0 0 20px", display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:8 }}>
                <div className="avatar" style={{ width:60, height:60, fontSize:24, background:"linear-gradient(135deg,#0055A5,#003d7a)" }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight:700, fontSize:18 }}>{user?.name}</div>
                  <div style={{ color:"var(--primary)", fontSize:13, fontWeight:600 }}>{user?.role}</div>
                  <div style={{ color:"var(--text3)", fontSize:12 }}>{user?.email}</div>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Full Name</label>
                <input ref={nameRef} className="form-input" defaultValue={user?.name} />
              </div>
              <div className="form-group"><label className="form-label">Email Address</label>
                <input ref={emailRef} className="form-input" type="email" defaultValue={user?.email} />
              </div>
              <div className="form-group"><label className="form-label">Role (set by Admin)</label>
                <input className="form-input" value={user?.role || ''} disabled style={{ opacity:0.6 }} readOnly />
              </div>
              <button className="btn btn-primary" onClick={handleUpdateProfile} disabled={saving} style={{ alignSelf:"flex-start" }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Access Permissions</span></div>
            <div style={{ padding:"0 0 20px" }}>
              {(user?.permissions || []).map(p => (
                <div key={p} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
                  <span style={{ fontSize:14, textTransform:"capitalize" }}>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                  <span style={{ fontSize:11, background:"rgba(46,125,50,0.1)", color:"var(--success)", padding:"2px 8px", borderRadius:10, fontWeight:600 }}>✓ Access</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SECURITY ── */}
      {tab === "security" && (
        <div className="card" style={{ maxWidth:480 }}>
          <div className="card-header"><span className="card-title">Change Password</span></div>
          <div style={{ padding:"0 0 20px", display:"flex", flexDirection:"column", gap:16 }}>
            <div className="form-group"><label className="form-label">Current Password</label>
              <input ref={curPassRef} className="form-input" type="password" placeholder="••••••••" />
            </div>
            <div className="form-group"><label className="form-label">New Password (min 6 chars)</label>
              <input ref={newPassRef} className="form-input" type="password" placeholder="Enter new password" />
            </div>
            <div className="form-group"><label className="form-label">Confirm New Password</label>
              <input ref={confPassRef} className="form-input" type="password" placeholder="Repeat new password" />
            </div>
            <button className="btn btn-primary" onClick={handleChangePassword} disabled={saving} style={{ alignSelf:"flex-start" }}>
              {saving ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>
      )}

      {/* ── ADMIN: USERS ── */}
      {tab === "users" && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">User Accounts ({users.length})</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div className="avatar" style={{ width:32, height:32, fontSize:13 }}>{u.name[0]}</div>
                        <div>
                          <div style={{ fontWeight:500, fontSize:14 }}>{u.name} {u.id === user?.id && <span style={{ fontSize:11, color:"var(--primary)" }}>(you)</span>}</div>
                          <div style={{ fontSize:11, color:"var(--text3)" }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontSize:12, fontWeight:600, background:"rgba(0,85,165,0.1)", color:"var(--primary)", padding:"2px 8px", borderRadius:10 }}>{u.role}</span></td>
                    <td><Badge status={u.is_active ? 'Active' : 'Inactive'} /></td>
                    <td style={{ fontSize:12, color:"var(--text3)" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display:"flex", gap:4 }}>
                        <button className="btn btn-xs btn-secondary" onClick={() => openEditUser(u)}><Icon name="edit" size={12} /></button>
                        <button className="btn btn-xs btn-secondary" title="Reset Password" onClick={() => handleResetPassword(u)}>🔑</button>
                        <button className="btn btn-xs btn-secondary" onClick={() => handleToggleActive(u)}
                          style={{ color: u.is_active ? "var(--danger)" : "var(--success)" }}>
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                        {u.id !== user?.id && (
                          <button className="btn btn-xs btn-danger" onClick={() => handleDeleteUser(u)}><Icon name="trash" size={12} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ADMIN: REGISTRATION REQUESTS ── */}
      {tab === "requests" && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Registration Requests ({requests.length})</span>
            <div style={{ display:"flex", gap:8 }}>
              <span style={{ fontSize:12, background:"rgba(198,40,40,0.1)", color:"var(--danger)", padding:"4px 10px", borderRadius:10, fontWeight:600 }}>
                {pendingRequests.length} Pending
              </span>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Applicant</th><th>Requested Role</th><th>Department</th><th>Email Verified</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign:'center', padding:'30px', color:'var(--text3)' }}>No registration requests yet</td></tr>
                ) : requests.map(r => (
                  <tr key={r.id} style={{ background: (r.status==='Pending'||r.status==='Verified') ? "rgba(255,152,0,0.04)" : undefined }}>
                    <td>
                      <div style={{ fontWeight:500 }}>{r.name}</div>
                      <div style={{ fontSize:11, color:"var(--text3)" }}>{r.email}</div>
                      {r.phone && <div style={{ fontSize:11, color:"var(--text3)" }}>{r.phone}</div>}
                    </td>
                    <td><span style={{ fontSize:12, fontWeight:600, background:"rgba(0,85,165,0.1)", color:"var(--primary)", padding:"2px 8px", borderRadius:10 }}>{r.requested_role}</span></td>
                    <td style={{ fontSize:13, color:"var(--text2)" }}>{r.department || '—'}</td>
                    <td style={{ textAlign:'center' }}>{r.email_verified ? '✅' : '❌'}</td>
                    <td><Badge status={r.status} /></td>
                    <td style={{ fontSize:12, color:"var(--text3)" }}>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      {(r.status === 'Pending' || r.status === 'Verified') && (
                        <button className="btn btn-xs btn-primary" onClick={() => openReviewModal(r)}>
                          Review
                        </button>
                      )}
                      {r.status === 'Approved' && <span style={{ fontSize:12, color:"var(--success)" }}>✓ Approved</span>}
                      {r.status === 'Rejected' && <span style={{ fontSize:12, color:"var(--danger)" }}>✗ Rejected</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ADMIN: SYSTEM SETTINGS ── */}
      {tab === "system" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">General Settings</span></div>
            <div style={{ padding:"0 0 20px", display:"flex", flexDirection:"column", gap:16 }}>
              <div className="form-group"><label className="form-label">School / Organization Name</label>
                <input className="form-input" value={schoolName} onChange={e => setSchoolName(e.target.value)} />
              </div>
              <div className="form-group"><label className="form-label">Timezone</label>
                <select className="form-input" value={timezone} onChange={e => setTimezone(e.target.value)}>
                  <option value="Africa/Cairo">Africa/Cairo (EET +2)</option>
                  <option value="UTC">UTC</option>
                  <option value="Asia/Riyadh">Asia/Riyadh (+3)</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Currency</label>
                <select className="form-input" value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="EGP">EGP — Egyptian Pound</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="SAR">SAR — Saudi Riyal</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => toast("Settings saved","success")} style={{ alignSelf:"flex-start" }}>Save</button>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Attendance Settings</span></div>
            <div style={{ padding:"0 0 20px", display:"flex", flexDirection:"column", gap:16 }}>
              <div className="form-group"><label className="form-label">GPS Radius (meters)</label>
                <input className="form-input" type="number" value={gpsRadius} onChange={e => setGpsRadius(e.target.value)} />
              </div>
              <div className="grid-2">
                <div className="form-group"><label className="form-label">Work Start Time</label>
                  <input className="form-input" type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} />
                </div>
                <div className="form-group"><label className="form-label">Work End Time</label>
                  <input className="form-input" type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} />
                </div>
              </div>
              <div className="form-group"><label className="form-label">Late Grace Period (minutes)</label>
                <input className="form-input" type="number" value={lateGrace} onChange={e => setLateGrace(e.target.value)} />
              </div>
              <div className="form-group"><label className="form-label">QR Code Refresh</label>
                <select className="form-input" defaultValue="30">
                  <option value="30">Every 30 seconds</option>
                  <option value="60">Every 60 seconds</option>
                </select>
              </div>
              <button className="btn btn-primary" onClick={() => toast("Attendance settings saved","success")} style={{ alignSelf:"flex-start" }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      <Modal open={showUserModal} onClose={() => setShowUserModal(false)} title={`Edit User — ${editUser?.name || ''}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowUserModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveUser}>Save Changes</button>
        </>}
      >
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="form-group"><label className="form-label">Full Name</label>
            <input ref={euNameRef} className="form-input" />
          </div>
          <div className="form-group"><label className="form-label">Email</label>
            <input ref={euEmailRef} className="form-input" type="email" />
          </div>
          <div className="form-group"><label className="form-label">Role</label>
            <select ref={euRoleRef} className="form-input">
              {SYSTEM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Review Registration Request Modal */}
      <Modal open={showReviewModal} onClose={() => setShowReviewModal(false)} title="Review Registration Request"
        footer={<>
          <button className="btn btn-danger" onClick={handleRejectRequest}>Reject</button>
          <button className="btn btn-primary" onClick={handleApproveRequest}>✅ Approve & Send Credentials</button>
        </>}
      >
        {reviewReq && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ padding:16, background:"var(--surface2)", borderRadius:8 }}>
              <div style={{ fontWeight:600, fontSize:15 }}>{reviewReq.name}</div>
              <div style={{ fontSize:13, color:"var(--text3)", marginTop:4 }}>{reviewReq.email}</div>
              {reviewReq.department && <div style={{ fontSize:12, color:"var(--text2)", marginTop:2 }}>Dept: {reviewReq.department}</div>}
              {reviewReq.phone && <div style={{ fontSize:12, color:"var(--text2)" }}>Phone: {reviewReq.phone}</div>}
              {reviewReq.reason && <div style={{ fontSize:12, color:"var(--text2)", marginTop:4 }}>Reason: {reviewReq.reason}</div>}
              <div style={{ marginTop:8 }}>
                <span style={{ fontSize:11, color: reviewReq.email_verified ? "var(--success)" : "var(--danger)", fontWeight:600 }}>
                  {reviewReq.email_verified ? '✅ Email Verified' : '❌ Email NOT Verified'}
                </span>
              </div>
            </div>

            <div className="form-group"><label className="form-label">Assign Role (Admin can change)</label>
              <select ref={reviewRoleRef} className="form-input">
                {SYSTEM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="form-group"><label className="form-label">Admin Notes (optional)</label>
              <input ref={reviewNotesRef} className="form-input" placeholder="Any notes..." />
            </div>

            <div style={{ padding:12, background:"rgba(0,85,165,0.06)", borderRadius:8, fontSize:12, color:"var(--text2)" }}>
              💡 If approved, a random password will be generated and sent to <strong>{reviewReq.email}</strong> via email.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
