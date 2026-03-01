"use client";

import { useState, useEffect, useRef } from "react";
import { SearchBar, Pagination, Badge, Modal, Tabs } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { Icon } from "@/components/ui/Icon";
import { apiClient } from "@/services/apiClient";

const TABS = [{ id:"suppliers", label:"Supplier Directory" }, { id:"orders", label:"Purchase Orders" }];

export default function Suppliers() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [poItems, setPoItems] = useState<any[]>([{ name:'', quantity:1, unitPrice:0 }]);
  const [poNotes, setPoNotes] = useState('');
  const [poSupplierId, setPoSupplierId] = useState('');
  const [tab, setTab] = useState("suppliers");
  const [loading, setLoading] = useState(true);
  const perPage = 10;

  const nameRef     = useRef<HTMLInputElement>(null);
  const phoneRef    = useRef<HTMLInputElement>(null);
  const emailRef    = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<any>(`/suppliers?search=${search}&page=${page}&limit=${perPage}`);
      setData(res.data); setTotal(res.total);
    } catch { toast("Failed to load suppliers","error"); }
    finally { setLoading(false); }
  };

  const fetchOrders = async () => {
    try { setOrders(await apiClient.get<any[]>('/suppliers/purchase-orders')); }
    catch { toast("Failed to load orders","error"); }
  };

  useEffect(() => { fetchData(); }, [search, page]);
  useEffect(() => { if(tab==="orders") fetchOrders(); }, [tab]);

  const handleAdd = async () => {
    const name = nameRef.current?.value?.trim();
    const contact = phoneRef.current?.value?.trim();
    const email = emailRef.current?.value?.trim();
    const category = categoryRef.current?.value?.trim();

    // Validation
    if (!name) { toast("Company name is required","error"); return; }
    if (!contact) { toast("Contact phone is required","error"); return; }
    if (!email) { toast("Email is required","error"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast("Invalid email format","error"); return; }
    if (!/^\+?[0-9\s\-()]+$/.test(contact)) { toast("Invalid phone format","error"); return; }
    if (!category) { toast("Category is required","error"); return; }

    try {
      await apiClient.post('/suppliers', { name, contact, email, category });
      toast("Supplier added successfully!","success");
      setShowModal(false);
      nameRef.current!.value = '';
      phoneRef.current!.value = '';
      emailRef.current!.value = '';
      fetchData();
    } catch (error: any) { toast(error.message || "Failed to add supplier","error"); }
  };

  const handleCreatePO = async () => {
    if (!poSupplierId) { toast("Select a supplier","error"); return; }
    const validItems = poItems.filter(i => i.name.trim() && i.quantity > 0 && i.unitPrice >= 0);
    if (!validItems.length) { toast("Add at least one valid item","error"); return; }
    if (validItems.some(i => !i.name.trim())) { toast("All items need a name","error"); return; }
    try {
      await apiClient.post('/suppliers/purchase-orders', { supplierId: poSupplierId, items: validItems, notes: poNotes });
      toast("Purchase order created successfully","success");
      setShowPOModal(false);
      setPoItems([{ name:'', quantity:1, unitPrice:0 }]);
      setPoNotes('');
      setPoSupplierId('');
      fetchOrders();
    } catch (e: any) { toast(e.message || "Failed to create PO","error"); }
  };

  const handlePoStatusChange = async (id: number, status: string) => {
    try {
      await apiClient.patch(`/suppliers/purchase-orders/${id}/status`, { status });
      toast(`PO marked as ${status}`,"success"); fetchOrders();
    } catch { toast("Failed","error"); }
  };

  return (
    <div className="fade-in">
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "suppliers" && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Suppliers ({total})</span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><Icon name="plus" size={14} />Add Supplier</button>
          </div>
          <div className="filter-bar">
            <SearchBar value={search} onChange={(v)=>{setSearch(v);setPage(1);}} placeholder="Search supplier..." />
          </div>
          {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>Loading...</div> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Supplier</th><th>Category</th><th>Contact</th><th>Total Orders</th><th>Total Value</th><th>Rating</th><th>Status</th></tr></thead>
                <tbody>
                  {data.map(s => (
                    <tr key={s.id}>
                      <td><div style={{ fontWeight:600 }}>{s.name}</div><div style={{ fontSize:11, color:"var(--text3)" }}>{s.email}</div></td>
                      <td><span style={{ background:"var(--accent2)", color:"var(--primary)", padding:"2px 8px", borderRadius:12, fontSize:11 }}>{s.category}</span></td>
                      <td style={{ fontSize:13 }}>{s.contact}</td>
                      <td style={{ fontWeight:500 }}>{s.totalOrders}</td>
                      <td style={{ fontWeight:500 }}>EGP {s.totalValue.toLocaleString()}</td>
                      <td><div style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ color:"#F57C00" }}>★</span><span style={{ fontWeight:600 }}>{s.rating}</span></div></td>
                      <td><Badge status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination total={total} perPage={perPage} page={page} setPage={setPage} />
        </div>
      )}

      {tab === "orders" && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Purchase Orders ({orders.length})</span>
            <button className="btn btn-primary btn-sm" onClick={() => setShowPOModal(true)}><Icon name="plus" size={14} />New PO</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>PO Number</th><th>Supplier</th><th>Total (EGP)</th><th>Order Date</th><th>Delivery</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign:'center', padding:'20px', color:'var(--text3)' }}>No purchase orders yet. Create your first PO.</td></tr>
                ) : orders.map((o: any) => (
                  <tr key={o.id}>
                    <td style={{ fontFamily:"monospace", fontWeight:600, color:"var(--primary)" }}>{o.po_number}</td>
                    <td style={{ fontWeight:500 }}>{o.supplier}</td>
                    <td style={{ fontWeight:600 }}>EGP {o.total.toLocaleString()}</td>
                    <td style={{ color:"var(--text3)", fontSize:13 }}>{o.ordered_date}</td>
                    <td style={{ fontSize:13 }}>{o.delivery_date || '—'}</td>
                    <td><Badge status={o.status} /></td>
                    <td>
                      <div style={{ display:"flex", gap:4 }}>
                        {o.status === 'Pending' && (
                          <button className="btn btn-xs btn-success" onClick={() => handlePoStatusChange(o.id,'Approved')}>Approve</button>
                        )}
                        {o.status === 'Approved' && (
                          <button className="btn btn-xs btn-primary" onClick={() => handlePoStatusChange(o.id,'Delivered')}>Mark Delivered</button>
                        )}
                        {!['Delivered','Cancelled'].includes(o.status) && (
                          <button className="btn btn-xs btn-danger" onClick={() => handlePoStatusChange(o.id,'Cancelled')}>Cancel</button>
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

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New Supplier"
        footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAdd}>Add Supplier</button></>}
      >
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="form-group"><label className="form-label">Company Name</label><input ref={nameRef} className="form-input" placeholder="Supplier company name" /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Contact Phone</label><input ref={phoneRef} className="form-input" placeholder="+20 2 XXXX-XXXX" /></div>
            <div className="form-group"><label className="form-label">Email</label><input ref={emailRef} className="form-input" type="email" /></div>
          </div>
          <div className="form-group"><label className="form-label">Supply Category</label>
            <select ref={categoryRef} className="form-input">
              {["Stationery","Electronics","Workshop","Lab","Safety","Sports","Maintenance"].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* New Purchase Order Modal */}
      <Modal open={showPOModal} onClose={() => setShowPOModal(false)} title="Create Purchase Order"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowPOModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreatePO}>Create PO</button>
        </>}
      >
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="form-group"><label className="form-label">Supplier *</label>
            <select className="form-input" value={poSupplierId} onChange={e => setPoSupplierId(e.target.value)}>
              <option value="">— Select supplier —</option>
              {data.filter(s=>s.status==='Active').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="form-label">Items *</label>
            {poItems.map((item, idx) => (
              <div key={idx} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr auto", gap:8, marginBottom:8 }}>
                <input className="form-input" placeholder="Item name" value={item.name}
                  onChange={e => setPoItems(prev => prev.map((p,i) => i===idx ? { ...p, name:e.target.value } : p))} />
                <input className="form-input" type="number" placeholder="Qty" min="1" value={item.quantity}
                  onChange={e => setPoItems(prev => prev.map((p,i) => i===idx ? { ...p, quantity:parseInt(e.target.value)||1 } : p))} />
                <input className="form-input" type="number" placeholder="Unit Price" min="0" value={item.unitPrice}
                  onChange={e => setPoItems(prev => prev.map((p,i) => i===idx ? { ...p, unitPrice:parseFloat(e.target.value)||0 } : p))} />
                <button className="btn btn-xs btn-danger" onClick={() => setPoItems(prev => prev.filter((_,i)=>i!==idx))} disabled={poItems.length===1}>
                  <Icon name="trash" size={12} />
                </button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" onClick={() => setPoItems(prev => [...prev, { name:'', quantity:1, unitPrice:0 }])}>
              <Icon name="plus" size={12} />Add Item
            </button>
            <div style={{ marginTop:8, textAlign:'right', fontWeight:600, color:'var(--primary)' }}>
              Total: EGP {poItems.reduce((s,i)=>s+(i.quantity*i.unitPrice),0).toLocaleString()}
            </div>
          </div>

          <div className="form-group"><label className="form-label">Notes</label>
            <input className="form-input" placeholder="Optional notes..." value={poNotes} onChange={e => setPoNotes(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
