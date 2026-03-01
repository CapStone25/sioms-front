"use client";

import { useState, useEffect, useRef } from "react";
import { KPICard, SearchBar, Pagination, Badge, Modal } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { Icon } from "@/components/ui/Icon";
import { apiClient } from "@/services/apiClient";

const INVENTORY_CATEGORIES = ["All","Stationery","Electronics","Workshop","Lab","Sports","Safety","Maintenance"];
const UNITS = ["pcs","kg","liter","box","roll","set","meter","pack"];

export default function Inventory() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const perPage = 12;

  const nameRef     = useRef<HTMLInputElement>(null);
  const catRef      = useRef<HTMLSelectElement>(null);
  const qtyRef      = useRef<HTMLInputElement>(null);
  const minStockRef = useRef<HTMLInputElement>(null);
  const unitRef     = useRef<HTMLSelectElement>(null);
  const priceRef    = useRef<HTMLInputElement>(null);
  const supplierRef = useRef<HTMLSelectElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const stockOutItemRef = useRef<HTMLSelectElement>(null);
  const stockOutQtyRef  = useRef<HTMLInputElement>(null);
  const editNameRef  = useRef<HTMLInputElement>(null);
  const editCatRef   = useRef<HTMLSelectElement>(null);
  const editQtyRef   = useRef<HTMLInputElement>(null);
  const editMinRef   = useRef<HTMLInputElement>(null);
  const editUnitRef  = useRef<HTMLSelectElement>(null);
  const editPriceRef = useRef<HTMLInputElement>(null);
  const editSupRef   = useRef<HTMLInputElement>(null);
  const editLocRef   = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, sum] = await Promise.all([
        apiClient.get<any>(`/inventory?search=${search}&category=${catFilter}&page=${page}&limit=${perPage}`),
        apiClient.get<any>('/inventory/summary'),
      ]);
      setData(res.data); setTotal(res.total); setSummary(sum);
    } catch { toast("Failed to load inventory","error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, catFilter, page]);
  useEffect(() => {
    apiClient.get<any[]>('/inventory/suppliers-list').then(setSuppliers).catch(() => {});
  }, []);

  const handleAddStock = async () => {
    const name = nameRef.current?.value?.trim();
    const qty = qtyRef.current?.value;
    const price = priceRef.current?.value;
    const location = locationRef.current?.value?.trim();
    if (!name || name.length < 2) { toast("Item name must be at least 2 characters","error"); return; }
    if (!qty || parseInt(qty) < 0) { toast("Valid quantity is required","error"); return; }
    if (!price || parseFloat(price) < 0) { toast("Valid unit price is required","error"); return; }
    if (!location) { toast("Storage location is required","error"); return; }
    try {
      await apiClient.post('/inventory', {
        name, category: catRef.current?.value,
        quantity: parseInt(qty),
        minStock: parseInt(minStockRef.current?.value || '10'),
        unit: unitRef.current?.value || 'pcs',
        unitPrice: parseFloat(price),
        supplier: supplierRef.current?.value || '',
        location,
      });
      toast("Stock added successfully","success");
      setShowStockInModal(false);
      fetchData();
    } catch (e: any) { toast(e.message || "Failed to add stock","error"); }
  };

  const handleStockOut = async () => {
    const itemId = stockOutItemRef.current?.value;
    const qty = parseInt(stockOutQtyRef.current?.value || '0');
    if (!itemId) { toast("Select an item","error"); return; }
    if (!qty || qty <= 0) { toast("Quantity must be greater than 0","error"); return; }
    const item = data.find(i => String(i.id) === itemId);
    if (item && qty > item.quantity) { toast(`Only ${item.quantity} units available`,"error"); return; }
    try {
      await apiClient.patch(`/inventory/${itemId}/quantity`, { quantity: qty, operation: 'subtract' });
      toast(`Stock out: ${qty} units removed`,"success");
      setShowStockOutModal(false);
      fetchData();
    } catch (e: any) { toast(e.message || "Failed to process stock out","error"); }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setShowEditModal(true);
    setTimeout(() => {
      if (editNameRef.current)  editNameRef.current.value  = item.name || '';
      if (editCatRef.current)   editCatRef.current.value   = item.category || '';
      if (editQtyRef.current)   editQtyRef.current.value   = item.quantity;
      if (editMinRef.current)   editMinRef.current.value   = item.minStock;
      if (editUnitRef.current)  editUnitRef.current.value  = item.unit || 'pcs';
      if (editPriceRef.current) editPriceRef.current.value = item.unitPrice;
      if (editSupRef.current)   editSupRef.current.value   = item.supplier || '';
      if (editLocRef.current)   editLocRef.current.value   = item.location || '';
    }, 50);
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    const name = editNameRef.current?.value?.trim();
    if (!name || name.length < 2) { toast("Item name must be at least 2 characters","error"); return; }
    const qty = parseInt(editQtyRef.current?.value || '0');
    const price = parseFloat(editPriceRef.current?.value || '0');
    if (isNaN(qty) || qty < 0) { toast("Quantity must be non-negative","error"); return; }
    if (isNaN(price) || price < 0) { toast("Price must be non-negative","error"); return; }
    try {
      await apiClient.put(`/inventory/${editItem.id}`, {
        name, category: editCatRef.current?.value, quantity: qty,
        min_stock: parseInt(editMinRef.current?.value || '10'),
        unit: editUnitRef.current?.value || 'pcs', unit_price: price,
        supplier: editSupRef.current?.value || '', location: editLocRef.current?.value || '',
      });
      toast("Item updated successfully","success");
      setShowEditModal(false); setEditItem(null); fetchData();
    } catch (e: any) { toast(e.message || "Failed to update","error"); }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await apiClient.delete(`/inventory/${item.id}`);
      toast(`${item.name} deleted`,"success"); fetchData();
    } catch { toast("Failed to delete","error"); }
  };

  const handleExport = () => {
    const csv = [
      ['SKU','Item Name','Category','Quantity','Min Stock','Unit','Unit Price','Location','Status'],
      ...data.map(i => [i.sku,i.name,i.category,i.quantity,i.minStock,i.unit,i.unitPrice,i.location,
        i.quantity===0?'Inactive':i.quantity<=i.minStock?'Low Stock':'Active'
      ])
    ].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
    link.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast('Inventory exported!','success');
  };

  const lowStockItems = data.filter(i => i.quantity <= i.minStock);

  return (
    <div className="fade-in">
      {lowStockItems.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom:16 }}>
          <Icon name="alert" size={16} />
          <strong>{lowStockItems.length} items</strong> are below minimum stock level and need restocking!
        </div>
      )}
      <div className="kpi-grid" style={{ gridTemplateColumns:"repeat(4,1fr)" }}>
        <KPICard icon="inventory" label="Total Items"  value={summary?.totalItems ?? '—'}                           color="#0055A5" bg="rgba(0,85,165,0.1)" />
        <KPICard icon="alert"     label="Low Stock"    value={summary?.lowStock ?? '—'}                             color="#C62828" bg="rgba(198,40,40,0.1)" />
        <KPICard icon="canteen"   label="Total Value"  value={`EGP ${((summary?.totalValue||0)/1000).toFixed(0)}K`} color="#2E7D32" bg="rgba(46,125,50,0.1)" />
        <KPICard icon="suppliers" label="Categories"   value={summary?.categories ?? '—'}                           color="#7B1FA2" bg="rgba(123,31,162,0.1)" />
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Inventory Stock ({total} items)</span>
          <div style={{ display:"flex", gap:8 }}>
            <button className="btn btn-success btn-sm" onClick={() => setShowStockInModal(true)}><Icon name="plus" size={14} />Stock In</button>
            <button className="btn btn-danger btn-sm"  onClick={() => setShowStockOutModal(true)}><Icon name="minus" size={14} />Stock Out</button>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}><Icon name="download" size={14} />Export</button>
          </div>
        </div>
        <div className="filter-bar">
          <SearchBar value={search} onChange={(v)=>{setSearch(v);setPage(1);}} placeholder="Search by name or SKU..." />
          {INVENTORY_CATEGORIES.map(c => (
            <button key={c} className={`btn btn-xs ${catFilter===c?"btn-primary":"btn-secondary"}`} onClick={()=>{setCatFilter(c);setPage(1);}}>
              {c}
            </button>
          ))}
        </div>
        {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--text3)' }}>Loading...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>SKU</th><th>Item Name</th><th>Category</th><th>Quantity</th><th>Min Stock</th><th>Unit Price</th><th>Location</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {data.map(item => {
                  const isLow = item.quantity <= item.minStock;
                  return (
                    <tr key={item.id}>
                      <td style={{ fontFamily:"monospace", fontSize:12, color:"var(--text3)" }}>{item.sku}</td>
                      <td style={{ fontWeight:500 }}>{item.name}</td>
                      <td><span style={{ background:"var(--accent2)", color:"var(--primary)", padding:"2px 8px", borderRadius:12, fontSize:11 }}>{item.category}</span></td>
                      <td><span style={{ fontWeight:600, color: isLow?"var(--danger)":"var(--text)" }}>{item.quantity} {item.unit} {isLow&&"⚠️"}</span></td>
                      <td style={{ color:"var(--text3)" }}>{item.minStock}</td>
                      <td>EGP {item.unitPrice}</td>
                      <td style={{ fontSize:12, color:"var(--text3)" }}>{item.location}</td>
                      <td><Badge status={item.quantity===0?"Inactive":isLow?"Late":"Active"} /></td>
                      <td>
                        <div style={{ display:"flex", gap:4 }}>
                          <button className="btn btn-xs btn-secondary" onClick={() => openEdit(item)}><Icon name="edit" size={12} /></button>
                          <button className="btn btn-xs btn-danger" onClick={() => handleDelete(item)}><Icon name="trash" size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination total={total} perPage={perPage} page={page} setPage={setPage} />
      </div>

      {/* Stock In Modal */}
      <Modal open={showStockInModal} onClose={() => setShowStockInModal(false)} title="Stock In — Add New Item"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowStockInModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddStock}>Confirm Stock In</button>
        </>}
      >
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="form-group"><label className="form-label">Item Name *</label><input ref={nameRef} className="form-input" placeholder="Enter item name" /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Category *</label>
              <select ref={catRef} className="form-input">{INVENTORY_CATEGORIES.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}</select>
            </div>
            <div className="form-group"><label className="form-label">Unit</label>
              <select ref={unitRef} className="form-input">{UNITS.map(u=><option key={u}>{u}</option>)}</select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Quantity *</label><input ref={qtyRef} className="form-input" type="number" placeholder="0" min="0" /></div>
            <div className="form-group"><label className="form-label">Min Stock Alert</label><input ref={minStockRef} className="form-input" type="number" defaultValue="10" min="0" /></div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Unit Price (EGP) *</label><input ref={priceRef} className="form-input" type="number" step="0.01" placeholder="0.00" /></div>
            <div className="form-group"><label className="form-label">Supplier</label>
              <select ref={supplierRef} className="form-input">
                <option value="">— No supplier —</option>
                {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Storage Location *</label><input ref={locationRef} className="form-input" placeholder="e.g., Warehouse-A, Shelf-3" /></div>
        </div>
      </Modal>

      {/* Stock Out Modal */}
      <Modal open={showStockOutModal} onClose={() => setShowStockOutModal(false)} title="Stock Out — Remove Items"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowStockOutModal(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleStockOut}>Confirm Stock Out</button>
        </>}
      >
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="form-group"><label className="form-label">Select Item *</label>
            <select ref={stockOutItemRef} className="form-input">
              <option value="">— Select item —</option>
              {data.filter(i=>i.quantity>0).map(i => (
                <option key={i.id} value={i.id}>{i.name} — Available: {i.quantity} {i.unit}</option>
              ))}
            </select>
          </div>
          <div className="form-group"><label className="form-label">Quantity to Remove *</label>
            <input ref={stockOutQtyRef} className="form-input" type="number" min="1" placeholder="Enter quantity" />
          </div>
          <div style={{ padding:12, background:"rgba(198,40,40,0.08)", borderRadius:8, fontSize:13, color:"var(--danger)" }}>
            ⚠️ Stock out is permanent. Ensure the quantity matches actually removed items.
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditItem(null); }} title={`Edit Item — ${editItem?.name || ''}`}
        footer={<>
          <button className="btn btn-secondary" onClick={() => { setShowEditModal(false); setEditItem(null); }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
        </>}
      >
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div className="form-group"><label className="form-label">Item Name *</label><input ref={editNameRef} className="form-input" /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Category</label>
              <select ref={editCatRef} className="form-input">{INVENTORY_CATEGORIES.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}</select>
            </div>
            <div className="form-group"><label className="form-label">Unit</label>
              <select ref={editUnitRef} className="form-input">{UNITS.map(u=><option key={u}>{u}</option>)}</select>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Quantity</label><input ref={editQtyRef} className="form-input" type="number" min="0" /></div>
            <div className="form-group"><label className="form-label">Min Stock</label><input ref={editMinRef} className="form-input" type="number" min="0" /></div>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Unit Price (EGP)</label><input ref={editPriceRef} className="form-input" type="number" step="0.01" /></div>
            <div className="form-group"><label className="form-label">Supplier</label><input ref={editSupRef} className="form-input" placeholder="Supplier name" /></div>
          </div>
          <div className="form-group"><label className="form-label">Storage Location</label><input ref={editLocRef} className="form-input" /></div>
        </div>
      </Modal>
    </div>
  );
}
