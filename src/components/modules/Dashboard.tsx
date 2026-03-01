"use client";

import { useState, useEffect } from "react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { KPICard } from "@/components/ui";
import { apiClient } from "@/services/apiClient";

const CHART_COLORS = ["#0055A5","#00A9CE","#2E7D32","#F57C00","#7B1FA2","#C62828"];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [attendanceChart, setAttendanceChart] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get<any>('/dashboard/stats'),
      apiClient.get<any[]>('/dashboard/revenue-chart'),
      apiClient.get<any[]>('/dashboard/attendance-chart'),
      apiClient.get<any[]>('/dashboard/recent-activity'),
    ]).then(([s, r, a, act]) => {
      setStats(s); setRevenueChart(r); setAttendanceChart(a); setActivity(act);
    }).finally(() => setLoading(false));
  }, []);

  const donutData = stats ? [
    { name: "Present", value: stats.attendance.present },
    { name: "Absent",  value: stats.attendance.absent },
    { name: "Late",    value: Math.max(0, (stats.attendance.present + stats.attendance.absent) - stats.attendance.present - stats.attendance.absent) },
    { name: "On Leave",value: stats.employees.onLeave },
  ] : [];

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Loading dashboard...</div>;

  return (
    <div className="fade-in">
      <div className="kpi-grid">
        <KPICard icon="users"      label="Total Employees"  value={stats?.employees.total ?? '—'}   trend="up"   trendValue={`${stats?.employees.active} active`}         color="#0055A5" bg="rgba(0,85,165,0.1)" />
        <KPICard icon="attendance" label="Present Today"    value={stats?.attendance.present ?? '—'} trend="up"   trendValue={`${stats?.attendance.rate}% rate`}            color="#2E7D32" bg="rgba(46,125,50,0.1)" />
        <KPICard icon="payroll"    label="Monthly Payroll"  value={`EGP ${((stats?.payroll.monthly||0)/1000).toFixed(0)}K`} trend="up" trendValue={`${stats?.payroll.pending} pending`} color="#7B1FA2" bg="rgba(123,31,162,0.1)" />
        <KPICard icon="inventory"  label="Low Stock Items"  value={stats?.inventory.lowStock ?? '—'} trend="down" trendValue="Needs attention"                              color="#C62828" bg="rgba(198,40,40,0.1)" />
        <KPICard icon="canteen"    label="Canteen Revenue"  value={`EGP ${((stats?.canteen.revenue||0)/1000).toFixed(0)}K`} trend="up" trendValue="+8% vs last month"      color="#F57C00" bg="rgba(245,124,0,0.1)" />
        <KPICard icon="workshop"   label="Active Equipment" value={`${stats?.workshop.active} / ${stats?.workshop.total}`} trend="down" trendValue={`${stats?.workshop.total - stats?.workshop.active} offline`} color="#00695C" bg="rgba(0,105,92,0.1)" />
      </div>

      <div className="charts-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Revenue Overview (Last 7 Months)</span>
            <button className="btn btn-secondary btn-sm">Export</button>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueChart}>
              <defs>
                <linearGradient id="canteenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0055A5" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0055A5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="inventoryGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00A9CE" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00A9CE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--text3)" }} />
              <YAxis tick={{ fontSize: 12, fill: "var(--text3)" }} tickFormatter={(v) => `${v/1000}K`} />
              <Tooltip formatter={(v: number) => `EGP ${v.toLocaleString()}`} />
              <Legend />
              <Area type="monotone" dataKey="canteen"   stroke="#0055A5" fill="url(#canteenGrad)"   name="Canteen"    strokeWidth={2} />
              <Area type="monotone" dataKey="inventory" stroke="#00A9CE" fill="url(#inventoryGrad)" name="Inventory"  strokeWidth={2} />
              <Area type="monotone" dataKey="services"  stroke="#2E7D32" fill="none"                name="Services"   strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Today&apos;s Attendance</span></div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                {donutData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", justifyContent:"space-around", marginTop:8 }}>
            {donutData.map((d, i) => (
              <div key={i} style={{ textAlign:"center" }}>
                <div style={{ fontWeight:700, fontSize:18, fontFamily:"Sora, sans-serif", color:CHART_COLORS[i] }}>{d.value}</div>
                <div style={{ fontSize:11, color:"var(--text3)" }}>{d.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header"><span className="card-title">Weekly Attendance Pattern</span></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={attendanceChart} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day"     tick={{ fontSize:12, fill:"var(--text3)" }} />
              <YAxis                   tick={{ fontSize:12, fill:"var(--text3)" }} />
              <Tooltip /><Legend iconSize={10} />
              <Bar dataKey="present" fill="#0055A5" name="Present" radius={[4,4,0,0]} />
              <Bar dataKey="late"    fill="#F57C00" name="Late"    radius={[4,4,0,0]} />
              <Bar dataKey="absent"  fill="#C62828" name="Absent"  radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Recent Activity</span></div>
          <div style={{ overflowY:"auto", maxHeight:220 }}>
            {activity.map((a, i) => (
              <div key={i} className="activity-item">
                <div className="activity-dot" style={{ background: CHART_COLORS[i % 6] }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:"var(--text)", lineHeight:1.4 }}>{a.message}</div>
                  <div className="activity-time">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
