"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import LoginPage from "@/components/modules/LoginPage";
import Dashboard from "@/components/modules/Dashboard";
import EmployeeDashboard from "@/components/modules/EmployeeDashboard";
import Attendance from "@/components/modules/Attendance";
import HR from "@/components/modules/HR";
import Payroll from "@/components/modules/Payroll";
import Canteen from "@/components/modules/Canteen";
import Inventory from "@/components/modules/Inventory";
import Suppliers from "@/components/modules/Suppliers";
import Workshop from "@/components/modules/Workshop";
import Assets from "@/components/modules/Assets";
import Settings from "@/components/modules/Settings";
import { ToastProvider } from "@/lib/toast";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import type { PageId } from "@/types";
import { authService } from "@/services/authService";

const PAGE_MAP: Record<PageId, React.ComponentType> = {
  dashboard: Dashboard,
  attendance: Attendance,
  hr: HR,
  payroll: Payroll,
  canteen: Canteen,
  inventory: Inventory,
  suppliers: Suppliers,
  workshop: Workshop,
  assets: Assets,
  settings: Settings
};

function AppContent() {
  const { user, logout, loading } = useAuth();
  const [dark, setDark] = useState(false);
  const [page, setPage] = useState<PageId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.className = dark ? "dark" : "";
  }, [dark]);

  // Hard redirect: Employee role always stays on dashboard
  useEffect(() => {
    if (!user) return;
    if (user.role === "Employee") {
      setPage("dashboard");
      return;
    }
    if (!authService.hasPermission(user, page)) {
      setPage("dashboard");
    }
  }, [user, page]);

  // Safe setPage wrapper: blocks Employee from navigating away from dashboard
  const handleSetPage = (newPage: PageId) => {
    if (user?.role === "Employee") return; // Employee stays on dashboard always
    if (!authService.hasPermission(user, newPage)) return;
    setPage(newPage);
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 20, fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>SIOMS</div>
          <div style={{ color: 'var(--text3)' }}>Loading your workspace...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Employee role: always show EmployeeDashboard, no sidebar navigation
  if (user.role === "Employee") {
    return (
      <div className="app-layout">
        <div className="main-content" style={{ marginLeft: 0 }}>
          <Navbar
            page={"dashboard"}
            collapsed={false}
            toggleCollapsed={() => {}}
            dark={dark}
            toggleDark={() => setDark((d) => !d)}
            user={user}
            onLogout={logout}
            onNavigate={() => {}}
          />
          <main className="page-content">
            <EmployeeDashboard />
          </main>
        </div>
      </div>
    );
  }

  const PageComponent = PAGE_MAP[page] || Dashboard;

  return (
    <div className="app-layout">
      <Sidebar
        page={page}
        setPage={handleSetPage}
        collapsed={collapsed}
        onLogout={logout}
        user={user}
      />
      <div className={`main-content ${collapsed ? "collapsed" : ""}`}>
        <Navbar
          page={page}
          collapsed={collapsed}
          toggleCollapsed={() => setCollapsed((c) => !c)}
          dark={dark}
          toggleDark={() => setDark((d) => !d)}
          user={user}
          onLogout={logout}
          onNavigate={handleSetPage}
        />
        <main className="page-content">
          <PageComponent />
        </main>
      </div>
    </div>
  );
}

export default function AppShell() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
