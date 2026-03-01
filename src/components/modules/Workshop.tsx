"use client";

import { useState, useEffect, useRef } from "react";
import { KPICard, Badge, Tabs, Modal } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { Icon } from "@/components/ui/Icon";
import { apiClient } from "@/services/apiClient";

const MAINTENANCE_TYPE_STYLE: Record<string,{background:string;color:string}> = {
  "Corrective":    { background:"#FFEBEE", color:"#C62828" },
  "Major Overhaul":{ background:"#EDE7F6", color:"#4527A0" },
  "Preventive":    { background:"#E8F5E9", color:"#2E7D32" },
  "Inspection":    { background:"#E3F2FD", color:"#1565C0" },
};
const TABS = [{ id:"equipment", label:"Equipment" },{ id:"maintenance", label:"Maintenance" },{ id:"assignments", label:"Assignments" }];

export default function Workshop() {
  const toast = useToast();
  const [tab, setTab] = useState("equipment");
  const [equipment, setEquipment] = useState<any[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEqModal, setShowEqModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editEq, setEditEq] = useState<any>(null);

  const eqNameRef   = useRef<HTMLInputElement>(null);
  const eqModelRef  = useRef<HTMLInputElement>(null);
  const eqDeptRef   = useRef<HTMLSelectElement>(null);
  const eqStatusRef = useRef<HTMLSelectElement>(null);
  const eqCondRef   = useRef<HTMLSelectElement>(null);
  const eqNextMaintRef = useRef<HTMLInputElement>(null);

  const assignEqRef   = useRef<HTMLSelectElement>(null);
  const assignToRef   = useRef<HTMLInputElement>(null);
  const assignPurRef  = useRef<HTMLInputElement>(null);
  const assignDateRef = useRef<HTMLInputElement>(null);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const [eq, sum] = await Promise.all([
        apiClient.get<any[]>('/workshop/equipment'),
        apiClient.get<any>('/workshop/equipment/summary'),
      ]);
      setEquipment(eq); setSummary(sum);
    } catch { toast("Failed to load equipment","error"); }
    finally { setLoading(false); }
  };

  const fetchLogs = async () => {
    try { setMaintenanceLogs(await apiClient.get<any[]>('/workshop/maintenance-logs')); }
    catch { toast("Failed to load logs","error"); }
  };

  const fetchAssignments = async () => {
    try { setAssignments(await apiClient.get<any[]>('/workshop/assignments')); }
    catch { toast("Failed to load assignments","error"); }
  };

  useEffect(() => { fetchEquipment(); }, []);
  useEffect(() => { if(tab==="maintenance") fetchLogs(); if(tab==="assignments") fetchAssignments(); }, [tab]);

  const openEqModal = (eq?: any) => {
    setEditEq(eq || null);
    setShowEqModal(true);
    setTimeout(() => {
      if (eqNameRef.current)   eqNameRef.current.value   = eq?.name   || '';
      if (eqModelRef.current)  eqModelRef.current.value  = eq?.model  || '';
      if (eqDeptRef.current)   eqDeptRef.current.value   = eq?.department || 'General';
      if (eqStatusRef.current) eqStatusRef.current.value = eq?.status || 'Active';
      if (eqCondRef.current)   eqCondRef.current.value   = eq?.condition || 'Good';
      if (eqNextMaintRef.current) eqNextMaintRef.current.value = eq?.nextMaintenance || '';
    }, 50);
  };

  const handleSaveEquipment = async () => {
    const name  = eqNameRef.current?.value?.trim();
    const model = eqModelRef.current?.value?.trim();
    if (!name || name.length < 2) { toast("Equipment name is required","error"); return; }
    if (!model || model.length < 2) { toast("Model is required","error"); return; }
    const body = {
      name, model, status: eqStatusRef.current?.value || 'Active',
      department: eqDeptRef.current?.value || 'General',
      condition: eqCondRef.current?.value || 'Good',
      nextMaintenance: eqNextMaintRef.current?.value || '',
    };
    try {
      if (editEq) {
        await apiClient.put(`/workshop/equipment/${editEq.id}`, body);
        toast("Equipment updated","success");
      } else {
        await apiClient.post('/workshop/equipment', body);
        toast("Equipment added","success");
      }
      setShowEqModal(false); setEditEq(null); fetchEquipment();
    } catch (e: any) { toast(e.message || "Failed to save","error"); }
  };

  const handleDeleteEquipment = async (eq: any) => {
    if (!confirm(`Delete "${eq.name}"?`)) return;
    try {
      await apiClient.delete(`/workshop/equipment/${eq.id}`);
      toast(`${eq.name} deleted`,"success"); fetchEquipment();
    } catch { toast("Failed to delete","error"); }
  };

  const handleAssignment = async () => {
    const eqId = assignEqRef.current?.value;
    const assignedTo = assignToRef.current?.value?.trim();
    const startDate = assignDateRef.current?.value;
    if (!eqId) { toast("Select equipment","error"); return; }
    if (!assignedTo || assignedTo.length < 2) { toast("Assignee name is required","error"); return; }
    if (!startDate) { toast("Start date is required","error"); return; }
    try {
      await apiClient.post('/workshop/assignments', {
        equipmentId: parseInt(eqId), assignedTo,
        purpose: assignPurRef.current?.value || '', startDate,
      });
      toast("Assignment created","success");
      setShowAssignModal(false); fetchAssignments();
    } catch (e: any) { toast(e.message || "Failed","error"); }
  };

  const handleReturnAssignment = async (a: any) => {
    if (!confirm(`Mark assignment for "${a.equipment_name}" as returned?`)) return;
    try {
      await apiClient.patch(`/workshop/assignments/${a.id}/return`, {});
      toast("Marked as returned","success"); fetchAssignments();
    } catch { toast("Failed","error"); }
  };

  const handleLogMaintenance = async (eq: any) => {
    const notes = prompt(`Maintenance notes for ${eq.name}:`);
    if (notes === null) return;
    try {
      await apiClient.post(`/workshop/equipment/${eq.id}/maintenance`, { notes, status: 'Active' });
      toast("Maintenance logged","success"); fetchEquipment();
    } catch { toast("Failed","error"); }
  };

  return (
    <div className="fade-in">
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "equipment" && (
        <div>
          <div className="kpi-grid" style={{ gridTemplateColumns:"repeat(3,1fr)" }}>
            <KPICard icon="workshop" label="Active"           value={summary?.active ?? '—'}           color="#2E7D32" bg="rgba(46,125,50,0.1)" />
            <KPICard icon="alert"    label="Under Maintenance" value={summary?.underMaintenance ?? '—'} color="#F57C00" bg="rgba(245,124,0,0.1)" />
            <KPICard icon="close"    label="Out of Service"   value={summary?.outOfService ?? '—'}     color="#C62828" bg="rgba(198,40,40,0.1)" />
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Equipment Registry</span>
              <button className="btn btn-primary btn-sm" onClick={() => openEqModal()}><Icon name="plus" size={14} />Add Equipment</button>
            </div>
            {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>Loading...</div> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Equipment</th><th>Model</th><th>Department</th><th>Status</th><th>Condition</th><th>Last Maintenance</th><th>Next Due</th><th>Actions</th></tr></thead>
                  <tbody>
                    {equipment.map(eq => {
                      const isOverdue = new Date(eq.nextMaintenance) < new Date();
                      return (
                        <tr key={eq.id}>
                          <td style={{ fontWeight:600 }}>{eq.name}</td>
                          <td style={{ fontSize:13, color:"var(--text3)" }}>{eq.model}</td>
                          <td>{eq.department}</td>
                          <td><Badge status={eq.status} /></td>
                          <td><Badge status={eq.condition} /></td>
                          <td style={{ color:"var(--text3)", fontSize:13 }}>{eq.lastMaintenance}</td>
                          <td><span style={{ fontSize:13, color:isOverdue?"var(--danger)":"var(--text2)", fontWeight:isOverdue?700:400 }}>{eq.nextMaintenance}</span></td>
                          <td>
                            <div style={{ display:"flex", gap:4 }}>
                              <button className="btn btn-xs btn-secondary" onClick={() => handleLogMaintenance(eq)}>
                                <Icon name="check" size={12} />Log
                              </button>
                              <button className="btn btn-xs btn-secondary" onClick={() => openEqModal(eq)}><Icon name="edit" size={12} /></button>
                              <button className="btn btn-xs btn-danger" onClick={() => handleDeleteEquipment(eq)}><Icon name="trash" size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "maintenance" && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Maintenance Logs ({maintenanceLogs.length})</span>
            <button className="btn btn-primary btn-sm" onClick={() => toast("Maintenance scheduled","success")}><Icon name="plus" size={14} />Schedule</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Equipment</th><th>Date</th><th>Technician</th><th>Notes</th></tr></thead>
              <tbody>
                {maintenanceLogs.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign:'center', padding:'20px', color:'var(--text3)' }}>No maintenance logs yet. Log maintenance from the Equipment tab.</td></tr>
                ) : maintenanceLogs.map((log,i) => (
                  <tr key={i}>
                    <td style={{ fontWeight:600 }}>{log.equipment_name}</td>
                    <td>{log.date}</td>
                    <td>{log.technician}</td>
                    <td style={{ color:"var(--text2)" }}>{log.notes||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "assignments" && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Equipment Assignments ({assignments.length})</span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAssignModal(true)}><Icon name="plus" size={14} />New Assignment</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Equipment</th><th>Assigned To</th><th>Purpose</th><th>Start Date</th><th>End Date</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {assignments.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign:'center', padding:'20px', color:'var(--text3)' }}>No assignments yet</td></tr>
                ) : assignments.map((a: any) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight:500 }}>{a.equipment_name}</td>
                    <td>{a.assigned_to}</td>
                    <td style={{ color:"var(--text2)", fontSize:13 }}>{a.purpose || '—'}</td>
                    <td style={{ fontSize:13 }}>{a.start_date}</td>
                    <td style={{ fontSize:13, color:"var(--text3)" }}>{a.end_date || '—'}</td>
                    <td><Badge status={a.status} /></td>
                    <td>
                      {a.status === 'Active' && (
                        <button className="btn btn-xs btn-secondary" onClick={() => handleReturnAssignment(a)}>Return</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Equipment Modal */}
      <Modal open={showEqModal} onClose={() => { setShowEqModal(false); setEditEq(null); }}
        title={editEq ? `Edit Equipment — ${editEq.name}` : "Add New Equipment"}
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setShowEqModal(false); setEditEq(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveEquipment}>{editEq ? "Save Changes" : "Add Equipment"}</button>
        </>}
      >
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="form-group"><label className="form-label">Equipment Name *</label><input ref={eqNameRef} className="form-input" placeholder="e.g., MIG Welder" /></div>
          <div className="form-group"><label className="form-label">Model / Serial No. *</label><input ref={eqModelRef} className="form-input" placeholder="e.g., Lincoln EM-350" /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Department</label>
              <select ref={eqDeptRef} className="form-input">
                {["General","Electronics","Mechanics","Welding","Woodworking","Plumbing","IT"].map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Status</label>
              <select ref={eqStatusRef} className="form-input">
                <option>Active</option><option>Under Maintenance</option><option>Out of Service</option>
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Condition</label>
              <select ref={eqCondRef} className="form-input">
                <option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Next Maintenance Date</label>
              <input ref={eqNextMaintRef} className="form-input" type="date" />
            </div>
          </div>
        </div>
      </Modal>

      {/* New Assignment Modal */}
      <Modal open={showAssignModal} onClose={() => setShowAssignModal(false)} title="New Equipment Assignment"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAssignment}>Create Assignment</button>
        </>}
      >
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="form-group"><label className="form-label">Equipment *</label>
            <select ref={assignEqRef} className="form-input">
              <option value="">— Select equipment —</option>
              {equipment.filter(e=>e.status==='Active').map(e => <option key={e.id} value={e.id}>{e.name} ({e.department})</option>)}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Assigned To *</label>
            <input ref={assignToRef} className="form-input" placeholder="e.g., Ahmed Hassan, Class 10-A" />
          </div>
          <div className="form-group"><label className="form-label">Purpose</label>
            <input ref={assignPurRef} className="form-input" placeholder="e.g., Welding Lab Session" />
          </div>
          <div className="form-group"><label className="form-label">Start Date *</label>
            <input ref={assignDateRef} className="form-input" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
