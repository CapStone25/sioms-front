"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import type { PageId, User } from "@/types";
import { NAV_ITEMS } from "./Sidebar";
import { apiClient } from "@/services/apiClient";

interface Notification {
  text: string;
  time: string;
  unread: boolean;
  type: string;
}

interface NavbarProps {
  page: PageId;
  collapsed: boolean;
  toggleCollapsed: () => void;
  dark: boolean;
  toggleDark: () => void;
  user: User;
  onLogout: () => void;
  onNavigate: (page: PageId) => void;
}

export const Navbar = ({ page, collapsed, toggleCollapsed, dark, toggleDark, user, onLogout, onNavigate }: NavbarProps) => {
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifRead, setNotifRead] = useState(false);

  useEffect(() => {
    // Fetch real-time notifications from multiple sources
    const fetchNotifications = async () => {
      const notifs: Notification[] = [];
      try {
        const invSummary = await apiClient.get<any>('/inventory/summary');
        if (invSummary.lowStock > 0) {
          notifs.push({ text: `⚠️ ${invSummary.lowStock} inventory items are below minimum stock`, time: 'now', unread: true, type: 'inventory' });
        }
      } catch {}
      try {
        const leaves = await apiClient.get<any[]>('/hr/leaves');
        const pending = leaves.filter((l: any) => l.status === 'Pending');
        if (pending.length > 0) {
          notifs.push({ text: `📋 ${pending.length} leave request${pending.length > 1 ? 's' : ''} pending approval`, time: 'now', unread: true, type: 'hr' });
        }
      } catch {}
      try {
        const eqSummary = await apiClient.get<any>('/workshop/equipment/summary');
        if (eqSummary.dueSoon > 0) {
          notifs.push({ text: `🔧 ${eqSummary.dueSoon} equipment maintenance due within 7 days`, time: 'today', unread: false, type: 'workshop' });
        }
        if (eqSummary.underMaintenance > 0) {
          notifs.push({ text: `🛠️ ${eqSummary.underMaintenance} equipment under maintenance`, time: 'today', unread: false, type: 'workshop' });
        }
      } catch {}
      try {
        const payrollSummary = await apiClient.get<any>('/payroll/summary');
        if (payrollSummary.pending > 0) {
          notifs.push({ text: `💰 ${payrollSummary.pending} payroll records pending payment`, time: 'today', unread: false, type: 'payroll' });
        }
      } catch {}
      if (notifs.length === 0) {
        notifs.push({ text: '✅ All systems operational — no alerts', time: 'now', unread: false, type: 'system' });
      }
      setNotifications(notifs);
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => n.unread && !notifRead).length;
  const currentNav = NAV_ITEMS.find((n) => n.id === page);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="icon-btn" onClick={toggleCollapsed}>
          <Icon name={collapsed ? "chevronRight" : "menu"} size={18} />
        </button>
        <div>
          <div className="page-title">{currentNav?.label || "Dashboard"}</div>
          <div className="breadcrumb">
            SIOMS
            <Icon name="chevronRight" size={10} style={{ color: "var(--text3)" }} />
            {currentNav?.group}
            <Icon name="chevronRight" size={10} style={{ color: "var(--text3)" }} />
            {currentNav?.label}
          </div>
        </div>
      </div>

      <div className="navbar-right">
        <button className="icon-btn" onClick={toggleDark}>
          <Icon name={dark ? "sun" : "moon"} size={18} />
        </button>

        <div className="dropdown">
          <button
            className="icon-btn"
            onClick={() => { setShowNotif((n) => !n); setShowProfile(false); setNotifRead(true); }}
          >
            <Icon name="bell" size={18} />
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>
          {showNotif && (
            <div className="dropdown-menu" style={{ width: 360 }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: 14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span>Notifications</span>
                <span style={{ fontSize:11, color:"var(--text3)" }}>Live from system</span>
              </div>
              {notifications.map((n, i) => (
                <div key={i} className={`notif-item ${n.unread && !notifRead ? "unread" : ""}`} onClick={() => setShowNotif(false)}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    {n.unread && !notifRead && <div className="notif-dot" style={{ marginTop: 5 }} />}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13 }}>{n.text}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{n.time}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="dropdown">
          <div
            className="profile-chip"
            onClick={() => { setShowProfile((p) => !p); setShowNotif(false); }}
          >
            <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{user.name}</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>{user.role}</div>
            </div>
            <Icon name="chevronDown" size={14} style={{ color: "var(--text3)" }} />
          </div>
          {showProfile && (
            <div className="dropdown-menu">
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>{user.email}</div>
              </div>
              <button className="dropdown-item" onClick={() => { setShowProfile(false); onNavigate('settings'); }}>
                <Icon name="users" size={16} />My Profile
              </button>
              <button className="dropdown-item" onClick={() => { setShowProfile(false); onNavigate('settings'); }}>
                <Icon name="edit" size={16} />Settings
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item" style={{ color: "var(--danger)" }} onClick={onLogout}>
                <Icon name="logout" size={16} />Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
