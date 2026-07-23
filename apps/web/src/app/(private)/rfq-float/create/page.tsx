'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Send, Plus, Search, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import * as rfqFloatApi from '@/lib/api/rfq-float';
import { getProcurements, type ProcurementListItem } from '@/lib/api/procurement';
import { apiFetch } from '@/lib/api/fetch';

interface VendorItem {
  id: string;
  vendorCode: string;
  vendorName: string;
  email?: string;
  phone?: string;   // kept for RFQ Float payload
  contact?: string; // from vendors API response
  status?: string;
}

// ─── Delivery Locations ──────────────────────────────────────────────────
const DELIVERY_LOCATIONS = [
  'D-247/11, D Block, Sector 63, Noida, Uttar Pradesh 201309',
  'Muzaffarnagar Road, Shamli-247776, Uttar Pradesh',
  'To Be Informed',
];

const MAKES_OPTIONS = [
  { value: 'NA', label: 'NA' },
  { value: 'JSW', label: 'JSW' },
  { value: 'SAIL', label: 'SAIL' },
  { value: 'TATA', label: 'TATA' },
  { value: 'RINL', label: 'RINL' },
  { value: 'Other', label: 'Other' },
];

export default function RfqFloatCreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ─── RFQ Details ────────────────────────────────────────────────────────
  const [rfqDate, setRfqDate] = useState(new Date().toISOString().split('T')[0]);
  const [submissionDeadline, setSubmissionDeadline] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [filledById, setFilledById] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [remarks, setRemarks] = useState('');

  // ─── Users for Filled By dropdown ──────────────────────────────────────
  const [users, setUsers] = useState<any[]>([]);

  // ─── Indent/Product Selection ───────────────────────────────────────────
  const [indents, setIndents] = useState<ProcurementListItem[]>([]);
  const [selectedIndents, setSelectedIndents] = useState<string[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<string, boolean>>(new Map());

  // ─── Vendor Selection ───────────────────────────────────────────────────
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<VendorItem[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');

  // ─── Quick Vendor ──────────────────────────────────────────────────────
  const [showQuickVendor, setShowQuickVendor] = useState(false);
  const [quickVendorName, setQuickVendorName] = useState('');
  const [quickVendorEmail, setQuickVendorEmail] = useState('');
  const [quickVendorPhone, setQuickVendorPhone] = useState('');

  // ─── Expanded Sections ──────────────────────────────────────────────────
  const [expandedSections, setExpandedSections] = useState({
    rfqDetails: true,
    products: true,
    vendors: true,
    review: false,
  });

  // ─── Load Data ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadIndents();
    loadVendors();
    loadUsers();
  }, []);

  async function loadIndents() {
    try {
      // Fetch indents at stage 3 (IN_PROGRESS = passed store check, NOT_AVAILABLE)
      // Also include stage 2 IN_PROGRESS as fallback
      const [stage3Res, stage2Res] = await Promise.all([
        getProcurements({ stage: 3, status: 'IN_PROGRESS', limit: 50 }),
        getProcurements({ stage: 2, status: 'IN_PROGRESS', limit: 50 }),
      ]);
      const stage3 = stage3Res.data || [];
      const stage2 = stage2Res.data || [];
      // Merge and deduplicate by id
      const seen = new Set<string>();
      const merged = [...stage3, ...stage2].filter(i => {
        if (seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      });
      setIndents(merged);
    } catch (err) {
      console.error('Failed to load indents:', err);
    }
  }

  async function loadUsers() {
    try {
      const res = await apiFetch('/users?limit=100');
      const data = Array.isArray(res) ? res : res?.data || res?.users || [];
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }

  async function loadVendors() {
    try {
      const res = await apiFetch('/vendors?limit=200');
      const data = Array.isArray(res) ? res : res?.data || res?.vendors || [];
      setVendors(data);
    } catch (err) {
      console.error('Failed to load vendors:', err);
    }
  }

  // ─── Indent Selection Handler ──────────────────────────────────────────
  function handleIndentSelect(indentId: string) {
    const indent = indents.find(i => i.id === indentId);
    if (!indent) return;

    if (selectedIndents.includes(indentId)) {
      // Deselect
      setSelectedIndents(prev => prev.filter(id => id !== indentId));
      setItems(prev => prev.filter(item => item.indentId !== indentId));
      // Remove selected items from map
      const newSelected = new Map(selectedItems);
      for (const [key] of newSelected) {
        if (key.startsWith(indentId + ':')) newSelected.delete(key);
      }
      setSelectedItems(newSelected);
    } else {
      // Select - load items
      setSelectedIndents(prev => [...prev, indentId]);
      const indentItems = (indent as any).items?.map((item: any) => ({
        ...item,
        indentId,
        indentItemId: item.id,
        isAvailableInStore: false,
        isSelected: true,
      })) || [];
      setItems(prev => [...prev, ...indentItems]);
      indentItems.forEach((item: any) => {
        setSelectedItems(prev => new Map(prev).set(`${indentId}:${item.id}`, true));
      });
    }
  }

  // ─── Item Selection Handler ────────────────────────────────────────────
  function toggleItemSelection(indentId: string, itemId: string) {
    const key = `${indentId}:${itemId}`;
    setSelectedItems(prev => {
      const next = new Map(prev);
      next.set(key, !next.get(key));
      return next;
    });
  }

  // ─── Vendor Selection Handler ──────────────────────────────────────────
  function handleVendorSelect(vendor: VendorItem) {
    if (selectedVendors.find(v => v.id === vendor.id)) {
      setSelectedVendors(prev => prev.filter(v => v.id !== vendor.id));
    } else if (selectedVendors.length < 5) {
      setSelectedVendors(prev => [...prev, vendor]);
    }
  }

  // ─── Make Selection Handler ────────────────────────────────────────────
  function handleMakeChange(itemKey: string, makeValue: string) {
    setItems(prev => prev.map(item => {
      const key = `${item.indentId}:${item.indentItemId}`;
      if (key === itemKey) {
        return { ...item, make: makeValue };
      }
      return item;
    }));
  }

  // ─── Unit Weight & Remarks Handlers ────────────────────────────────────
  function handleUnitWeightChange(itemKey: string, weightValue: string) {
    const val = parseFloat(weightValue);
    const isValid = !isNaN(val) && val >= 0;
    
    setItems(prev => prev.map(item => {
      const key = `${item.indentId}:${item.indentItemId}`;
      if (key === itemKey) {
        const unitWeight = isValid ? val : undefined;
        const totalWeight = isValid ? val * Number(item.quantity) : undefined;
        return { ...item, unitWeight, totalWeight };
      }
      return item;
    }));
  }

  function handleRemarksChange(itemKey: string, remarksValue: string) {
    setItems(prev => prev.map(item => {
      const key = `${item.indentId}:${item.indentItemId}`;
      if (key === itemKey) {
        return { ...item, itemRemarks: remarksValue };
      }
      return item;
    }));
  }

  // ─── Quick Vendor Create ───────────────────────────────────────────────
  async function handleQuickVendorCreate() {
    if (!quickVendorName.trim()) return;
    try {
      const vendor = await rfqFloatApi.createQuickVendor({
        companyName: quickVendorName.trim(),
        email: quickVendorEmail.trim() || undefined,
        phone: quickVendorPhone.trim() || undefined,
      });
      setVendors(prev => [...prev, vendor]);
      if (selectedVendors.length < 5) {
        setSelectedVendors(prev => [...prev, vendor]);
      }
      setQuickVendorName('');
      setQuickVendorEmail('');
      setQuickVendorPhone('');
      setShowQuickVendor(false);
    } catch (err) {
      console.error('Failed to create vendor:', err);
    }
  }

  // ─── Submit RFQ Float ──────────────────────────────────────────────────
  async function handleSubmit() {
    // Validation
    if (selectedVendors.length < 3) {
      setError('Please select at least 3 vendors (minimum requirement)');
      return;
    }
    if (selectedVendors.length > 5) {
      setError('Maximum 5 vendors allowed');
      return;
    }
    if (selectedIndents.length === 0) {
      setError('Please select at least one indent');
      return;
    }
    if (!filledById) {
      setError('Please select who is filling this RFQ');
      return;
    }

    const activeItems = items.filter(item => {
      const key = `${item.indentId}:${item.indentItemId}`;
      return selectedItems.get(key) && !item.isAvailableInStore;
    }).map(item => ({
      ...item,
      make: item.make || 'NA',
    }));

    if (activeItems.length === 0) {
      setError('No items available for RFQ. All items may be available in store.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await rfqFloatApi.createRfqFloat({
        rfqDate: rfqDate ? new Date(rfqDate).toISOString() : undefined,
        submissionDeadline: submissionDeadline ? new Date(submissionDeadline).toISOString() : undefined,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : undefined,
        filledById: filledById || undefined,
        deliveryLocation: deliveryLocation || undefined,
        remarks: remarks || undefined,
        items: activeItems.map(item => ({
          indentId: item.indentId,
          indentItemId: item.indentItemId || item.id,
          itemCode: item.itemCode,
          itemName: item.itemName,
          description: item.description,
          itemRemarks: item.itemRemarks,
          make: item.make || 'NA',
          quantity: Number(item.quantity),
          uom: item.uom || item.unit,
          unitWeight: item.unitWeight ? Number(item.unitWeight) : undefined,
          totalWeight: item.totalWeight ? Number(item.totalWeight) : undefined,
          isAvailableInStore: false,
          isSelected: true,
        })),
        vendors: selectedVendors.map(v => ({
          vendorId: v.id,
          vendorCode: v.vendorCode,
          vendorName: v.vendorName,
          email: v.email,
          phone: v.phone || v.contact,
        })),
      });

      setSuccess(`RFQ ${result.rfqNumber} created successfully!`);

      // Send to vendors
      try {
        await rfqFloatApi.sendRfqToVendors(result.id);
        setSuccess(`RFQ ${result.rfqNumber} created and sent to vendors!`);
      } catch (sendErr) {
        // Still success - RFQ was created
      }

      // Navigate to details after short delay
      setTimeout(() => {
        router.push(`/rfq-float/${result.id}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create RFQ Float');
    } finally {
      setLoading(false);
    }
  }

  // ─── Filter vendors by search ──────────────────────────────────────────
  const filteredVendors = vendors.filter(v =>
    v.vendorName?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.vendorCode?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    v.email?.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="page-content max-w-5xl mx-auto">
      <PageHeader
        title="RFQ Float Form"
        description="Create a new Request for Quotation across multiple indents"
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-emerald-700">{success}</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* RFQ DETAILS SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
        <button
          onClick={() => toggleSection('rfqDetails')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">RFQ Details</h2>
          {expandedSections.rfqDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {expandedSections.rfqDetails && (
          <div className="px-6 py-4 border-t border-gray-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  RFQ Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={rfqDate}
                  onChange={e => setRfqDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Submission Deadline <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={submissionDeadline}
                  onChange={e => setSubmissionDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={e => setExpectedDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Filled By <span className="text-red-500">*</span>
                </label>
                <select
                  value={filledById}
                  onChange={e => setFilledById(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select user</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                  Delivery Location <span className="text-red-500">*</span>
                </label>
                <select
                  value={deliveryLocation}
                  onChange={e => setDeliveryLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Select location</option>
                  {DELIVERY_LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                RFQ Remarks
              </label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                rows={3}
                placeholder="Enter any special instructions or remarks for vendors..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PRODUCT SELECTION SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
        <button
          onClick={() => toggleSection('products')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">Product Selection</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{selectedIndents.length} indent(s) selected</span>
            {expandedSections.products ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {expandedSections.products && (
          <div className="px-6 py-4 border-t border-gray-100 space-y-4">
            {/* Indent Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Select Indents <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {indents.map(indent => (
                  <button
                    key={indent.id}
                    onClick={() => handleIndentSelect(indent.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                      selectedIndents.includes(indent.id)
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedIndents.includes(indent.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}>
                      {selectedIndents.includes(indent.id) && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <div className="text-left">
                      <span className="font-medium">{indent.referenceNo}</span>
                      <span className="block text-xs text-gray-500">{indent.title?.substring(0, 30)}</span>
                    </div>
                  </button>
                ))}
                {indents.length === 0 && (
                  <p className="text-sm text-gray-500 col-span-3 text-center py-4">No indents available at RFQ stage</p>
                )}
              </div>
            </div>

            {/* Items Table */}
            {items.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Line Items
                </label>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Select</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Indent No.</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Make</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">UOM</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Unit Wt.</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total Wt.</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => {
                        const key = `${item.indentId}:${item.indentItemId}`;
                        const isSelected = selectedItems.get(key);
                        const indent = indents.find(i => i.id === item.indentId);
                        return (
                          <tr key={key} className={`border-t border-gray-100 ${
                            item.isAvailableInStore ? 'bg-gray-50 opacity-60' : isSelected ? 'bg-blue-50' : ''
                          }`}>
                            <td className="px-3 py-2">
                              {item.isAvailableInStore ? (
                                <span className="text-xs text-amber-600 font-medium">In Store</span>
                              ) : (
                                <button
                                  onClick={() => toggleItemSelection(item.indentId, item.indentItemId)}
                                  className={`w-5 h-5 rounded border flex items-center justify-center ${
                                    isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 text-white" />}
                                </button>
                              )}
                            </td>
                            <td className="px-3 py-2 font-medium text-gray-700">{indent?.referenceNo || item.indentId?.slice(0, 8)}</td>
                            <td className="px-3 py-2 text-gray-600">{item.itemCode || item.skuId || '—'}</td>
                            <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{item.itemName || item.description || '—'}</td>
                            <td className="px-3 py-2">
                              <select
                                value={item.make || item.approvedMakes || 'NA'}
                                onChange={(e) => handleMakeChange(key, e.target.value)}
                                className="text-xs border border-gray-300 rounded px-1 py-0.5"
                              >
                                {MAKES_OPTIONS.map(m => (
                                  <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right font-medium">{Number(item.quantity).toLocaleString()}</td>
                            <td className="px-3 py-2 text-gray-600">{item.uom || item.unit || '—'}</td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              <input
                                type="number"
                                min="0"
                                step="0.001"
                                value={item.unitWeight || ''}
                                onChange={(e) => handleUnitWeightChange(key, e.target.value)}
                                className="w-20 text-xs border border-gray-300 rounded px-2 py-1 text-right"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600 font-medium bg-gray-50">
                              {item.totalWeight ? Number(item.totalWeight).toFixed(3) : '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-500 text-xs">
                              <input
                                type="text"
                                value={item.itemRemarks || ''}
                                onChange={(e) => handleRemarksChange(key, e.target.value)}
                                className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                                placeholder="Remarks..."
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VENDOR SELECTION SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
        <button
          onClick={() => toggleSection('vendors')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900">Vendor Selection</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{selectedVendors.length}/5 selected</span>
            {expandedSections.vendors ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {expandedSections.vendors && (
          <div className="px-6 py-4 border-t border-gray-100 space-y-4">
            {/* Quick Vendor Add */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQuickVendor(!showQuickVendor)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add New Vendor
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={vendorSearch}
                  onChange={e => setVendorSearch(e.target.value)}
                  placeholder="Search vendors..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Quick Vendor Form */}
            {showQuickVendor && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">Add Vendor</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={quickVendorName}
                    onChange={e => setQuickVendorName(e.target.value)}
                    placeholder="Company Name *"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="email"
                    value={quickVendorEmail}
                    onChange={e => setQuickVendorEmail(e.target.value)}
                    placeholder="Email"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="tel"
                    value={quickVendorPhone}
                    onChange={e => setQuickVendorPhone(e.target.value)}
                    placeholder="Phone Number"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleQuickVendorCreate}
                    disabled={!quickVendorName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                  >
                    Save & Select
                  </button>
                  <button
                    onClick={() => setShowQuickVendor(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Selected Vendors */}
            {selectedVendors.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Selected Vendors
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedVendors.map(v => (
                    <div key={v.id} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                      <span className="font-medium text-emerald-700">{v.vendorName}</span>
                      <button
                        onClick={() => setSelectedVendors(prev => prev.filter(x => x.id !== v.id))}
                        className="text-emerald-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vendor List */}
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-10"></th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Vendor ID</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.map(v => {
                    const isSelected = selectedVendors.find(sv => sv.id === v.id);
                    const isMaxed = selectedVendors.length >= 5 && !isSelected;
                    return (
                      <tr
                        key={v.id}
                        onClick={() => !isMaxed && handleVendorSelect(v)}
                        className={`border-t border-gray-100 cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50' : isMaxed ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-3 py-2">
                          <span className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500">{v.vendorCode || v.id?.slice(0, 8)}</td>
                        <td className="px-3 py-2 font-medium text-gray-700">{v.vendorName}</td>
                        <td className="px-3 py-2 text-gray-600">{v.email || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{v.phone || v.contact || '—'}</td>
                      </tr>
                    );
                  })}
                  {filteredVendors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-gray-500">No vendors found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SUBMIT SECTION */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              <strong className="text-gray-900">{selectedIndents.length}</strong> indent(s) selected ·
              <strong className="text-gray-900 ml-1">{items.filter(i => selectedItems.get(`${i.indentId}:${i.indentItemId}`) && !i.isAvailableInStore).length}</strong> item(s) to float ·
              <strong className="text-gray-900 ml-1">{selectedVendors.length}</strong> vendor(s) selected
            </p>
            {selectedVendors.length < 3 && (
              <p className="text-xs text-amber-600 mt-1">⚠️ Select at least 3 vendors (minimum)</p>
            )}
            {selectedIndents.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">⚠️ Select at least one indent</p>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading || selectedVendors.length < 3 || selectedIndents.length === 0 || !filledById}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Submitting...' : 'Submit RFQ Float'}
          </button>
        </div>
      </div>
    </div>
  );
}