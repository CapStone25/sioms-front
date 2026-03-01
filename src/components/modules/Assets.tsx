"use client";

import { useState, useEffect, useRef } from "react";
import { KPICard, SearchBar, Badge, Modal } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { Icon } from "@/components/ui/Icon";
import { apiClient } from "@/services/apiClient";

export default function Assets() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAsset, setEditAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const assetNameRef = useRef<HTMLInputElement>(null);
  const empSelectRef = useRef<HTMLSelectElement>(null);
  const assignDateRef= useRef<HTMLInputElement>(null);
  const conditionRef = useRef<HTMLSelectElement>(null);

  const editNameRef  = useRef<HTMLInputElement>(null);
  const editStatusRef= useRef<HTMLSelectElement>(null);
  const editCondRef  = useRef<HTMLSelectElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [a, sum, emps] = await Promise.all([
        apiClient.get<any[]>('/assets'),
        apiClient.get<any>('/assets/summary'),
        apiClient.get<any[]>('/assets/employees-list'),
      ]);
      setAssets(a); setSummary(sum); setEmployees(emps);
    } catch { toast("Failed to load assets","error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = assets.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.assignedTo.toLowerCase().includes(search.toLowerCase()) ||
    a.assetId.toLowerCase().includes(search.toLowerCase())
  );

  const validateForm = (): boolean => {
    const name = assetNameRef.current?.value?.trim();
    const empId = empSelectRef.current?.value?.trim();
    const date = assignDateRef.current?.value?.trim();

    if (!name) { toast("Asset name is required","error"); return false; }
    if (name.length < 2) { toast("Asset name must be at least 2 characters","error"); return false; }
    if (!empId) { toast("Employee is required","error"); return false; }
    if (!date) { toast("Assign date is required","error"); return false; }
    const assignDate = new Date(date);
    if (assignDate > new Date()) { toast("Assign date cannot be in the future","error"); return false; }
    return true;
  };

  const handleAssign = async () => {
    if (!validateForm()) return;

    const emp = employees.find(e => e.employeeId === empSelectRef.current?.value);
    if (!emp) { toast("Employee not found","error"); return; }

    try {
      await apiClient.post('/assets', {
        name: assetNameRef.current?.value,
        assignedTo: emp.name,
        employeeId: emp.employeeId,
        assignDate: assignDateRef.current?.value || new Date().toISOString().split('T')[0],
        condition: conditionRef.current?.value || 'Good',
      });
      toast("Asset assigned successfully","success");
      setShowModal(false);
      assetNameRef.current!.value = '';
      assignDateRef.current!.value = new Date().toISOString().split('T')[0];
      fetchData();
    } catch (error: any) { toast(error.message || "Failed to assign asset","error"); }
  };

  const openEdit = (asset: any) => {
    setEditAsset(asset);
    setShowEditModal(true);
    setTimeout(() => {
      if (editNameRef.current)   editNameRef.current.value   = asset.name || '';
      if (editStatusRef.current) editStatusRef.current.value = asset.status || 'In Use';
      if (editCondRef.current)   editCondRef.current.value   = asset.condition || 'Good';
    }, 50);
  };

  const handleSaveEdit = async () => {
    if (!editAsset) return;
    const name = editNameRef.current?.value?.trim();
    if (!name || name.length < 2) { toast("Asset name is required","error"); return; }
    try {
      await apiClient.put(`/assets/${editAsset.id}`, {
        name, status: editStatusRef.current?.value,
        condition: editCondRef.current?.value,
        assigned_to: editAsset.assignedTo,
        employee_id: editAsset.employeeId,
      });
      toast("Asset updated successfully","success");
      setShowEditModal(false); setEditAsset(null); fetchData();
    } catch (e: any) { toast(e.message || "Failed to update","error"); }
  };

  const handleDelete = async (asset: any) => {
    if (!confirm(`Delete asset "${asset.name}"?`)) return;
    try {
      await apiClient.delete(`/assets/${asset.id}`);
      toast(`${asset.name} deleted`,"success"); fetchData();
    } catch { toast("Failed to delete","error"); }
  };

  const handleReturn = async (asset: any) => {
    if (!confirm(`Mark "${asset.name}" as returned?`)) return;
    try {
      await apiClient.post(`/assets/${asset.id}/return`, { condition: asset.condition });
      toast("Asset returned successfully","success"); fetchData();
    } catch { toast("Failed to return asset","error"); }
  };

  const history = assets.filter(a => a.returnDate).map(a => ({
    action: "Asset Returned", asset: a.name, from: a.assignedTo, date: a.returnDate, by: "Manager",
  }));

  return (
    <div className="fade-in">
      <div className="kpi-grid" style={{ gridTemplateColumns:"repeat(4,1fr)" }}>
        <KPICard icon="assets" label="Total Assets"   value={summary?.total ?? '—'}                                                      color="#0055A5" bg="rgba(0,85,165,0.1)" />
        <KPICard icon="assets" label="In Use"         value={summary?.inUse ?? '—'}                                                      color="#F57C00" bg="rgba(245,124,0,0.1)" />
        <KPICard icon="check"  label="Returned"       value={summary?.returned ?? '—'}                                                   color="#2E7D32" bg="rgba(46,125,50,0.1)" />
        <KPICard icon="trend"  label="Good Condition" value={(summary?.conditions?.Good||0) + (summary?.conditions?.Excellent||0)}        color="#7B1FA2" bg="rgba(123,31,162,0.1)" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Asset Custody Register</span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><Icon name="plus" size={14} />Assign Asset</button>
          </div>
          <div className="filter-bar">
            <SearchBar value={search} onChange={setSearch} placeholder="Search asset or employee..." />
          </div>
          {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>Loading...</div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Asset</th><th>Assigned To</th><th>Assign Date</th><th>Return Date</th><th>Status</th><th>Condition</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id}>
                      <td><div style={{ fontWeight:600 }}>{a.name}</div><div style={{ fontSize:11, color:"var(--text3)", fontFamily:"monospace" }}>{a.assetId}</div></td>
                      <td><div style={{ fontWeight:500 }}>{a.assignedTo}</div><div style={{ fontSize:11, color:"var(--text3)" }}>{a.employeeId}</div></td>
                      <td style={{ fontSize:13 }}>{a.assignDate}</td>
                      <td style={{ fontSize:13, color: a.returnDate?"var(--text2)":"var(--text3)" }}>{a.returnDate||"—"}</td>
                      <td><Badge status={a.status} /></td>
                      <td><Badge status={a.condition} /></td>
                      <td>
                        {a.status === "In Use" && (
                          <>
                            <div style={{ display:"flex", gap:4 }}>
                              <button className="btn btn-xs btn-secondary" onClick={() => openEdit(a)}><Icon name="edit" size={12} /></button>
                              <button className="btn btn-xs btn-secondary" onClick={() => handleReturn(a)}>Return</button>
                              <button className="btn btn-xs btn-danger" onClick={() => handleDelete(a)}><Icon name="trash" size={12} /></button>
                            </div>
                          </>
                        )}
                        {a.status === "Returned" && (
                          <button className="btn btn-xs btn-danger" onClick={() => handleDelete(a)}><Icon name="trash" size={12} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Custody History</span></div>
          <div style={{ position:"relative", paddingLeft:20 }}>
            {history.length===0 ? (
              <div style={{ padding:20, color:"var(--text3)", fontSize:13 }}>No returned assets yet.</div>
            ) : history.slice(0,6).map((h,i) => (
              <div key={i} style={{ position:"relative", paddingLeft:20, paddingBottom:20, borderLeft:i<history.length-1?"2px solid var(--border)":"none" }}>
                <div style={{ position:"absolute", left:-6, top:4, width:10, height:10, borderRadius:"50%", background:"var(--success)", border:"2px solid var(--surface)" }} />
                <div style={{ fontSize:13, fontWeight:600 }}>{h.action}</div>
                <div style={{ fontSize:12, color:"var(--text2)" }}>{h.asset}</div>
                <div style={{ fontSize:12, color:"var(--text3)" }}>from {h.from} · {h.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Assign Asset"
        footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAssign}>Assign</button></>}
      >
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="form-group"><label className="form-label">Asset Name</label><input ref={assetNameRef} className="form-input" placeholder="Asset name" /></div>
          <div className="form-group"><label className="form-label">Assign To</label>
            <select ref={empSelectRef} className="form-input">
              <option value="">Select an employee</option>
              {employees.map(e => <option key={e.id} value={e.employeeId}>{e.name} ({e.employeeId})</option>)}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Assign Date</label><input ref={assignDateRef} className="form-input" type="date" defaultValue={new Date().toISOString().split('T')[0]} /></div>
            <div className="form-group"><label className="form-label">Condition</label>
              <select ref={conditionRef} className="form-input"><option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option></select>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Asset Modal */}
      <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditAsset(null); }}
        title={`Edit Asset — ${editAsset?.name || ''}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setShowEditModal(false); setEditAsset(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
        </>}
      >
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="form-group"><label className="form-label">Asset Name *</label>
            <input ref={editNameRef} className="form-input" placeholder="Asset name" />
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Status</label>
              <select ref={editStatusRef} className="form-input">
                <option>In Use</option><option>Returned</option><option>Lost</option><option>Damaged</option>
              </select>
            </div>
            <div className="form-group"><label className="form-label">Condition</label>
              <select ref={editCondRef} className="form-input">
                <option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option>
              </select>
            </div>
          </div>
          {editAsset && (
            <div style={{ padding:12, background:"var(--surface2)", borderRadius:8, fontSize:13 }}>
              <div style={{ color:"var(--text3)", marginBottom:4 }}>Currently assigned to:</div>
              <div style={{ fontWeight:600 }}>{editAsset.assignedTo}</div>
              <div style={{ fontSize:12, color:"var(--text3)" }}>{editAsset.employeeId}</div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
