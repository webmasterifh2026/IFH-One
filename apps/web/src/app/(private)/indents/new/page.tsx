'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  ChevronRight,
  Paperclip,
  X,
  Download,
  Printer,
} from 'lucide-react';

import { CustomSelect } from '@/components/ui/custom-select';
import { EnterpriseSkuSelect } from '@/components/ui/enterprise-sku-select';
import {
  ProjectSelect,
  type ProjectOption,
} from '@/components/ui/project-select';
import type { SelectOption } from '@/components/ui/searchable-select';
import { createProcurement } from '@/lib/api/procurement';
import { apiFetch } from '@/lib/api/fetch';
import { useAuth } from '@/contexts/AuthContext';
import { PrintableIndent } from '@/components/procurement/PrintableIndent';

/* ── Style helpers ─────────────────────────────────────────────────────── */
const FIELD: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};
const LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
};
const INPUT_BASE: React.CSSProperties = {
  height: 38,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--card)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  transition: 'border-color 150ms, box-shadow 150ms',
  width: '100%',
};
const TEXTAREA_BASE: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  backgroundColor: 'var(--card)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  resize: 'vertical',
  minHeight: 80,
  width: '100%',
  transition: 'border-color 150ms, box-shadow 150ms',
};
const INPUT_DISABLED: React.CSSProperties = {
  ...INPUT_BASE,
  backgroundColor: 'var(--surface2)',
  color: 'var(--text-secondary)',
  cursor: 'not-allowed',
};

/* ── Fixed dropdown enums (business-defined) ───────────────────────────── */
const APPLICATIONS = ['ESP', 'Bag Filter', 'Process Bag Filter', 'NA'];
const ITEM_TYPES = [
  'Ready-Made',
  'Tailor-Made',
  'Market Item',
  'Provisional Item',
  'Manufacturing/Machining',
];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const UOMS = ['pcs', 'kg', 'mt', 'nos', 'm', 'mm', 'l', 'set', 'lot', 'pair'];
const WARRANTY_OPTS = [
  'Not Applicable',
  '6 Months',
  '12 Months',
  '18 Months',
  '24 Months',
  '36 Months',
];
const DELIVERY_OPTS = ['Ex-Works', 'FOR Destination', 'CIF', 'FOB'];
const PAYMENT_OPTS = [
  'Advance Payment',
  '30 Days',
  '45 Days',
  '60 Days',
  'As Per PO Terms',
];
const CERT_OPTS = [
  'Internal Records',
  'Client Verification',
  'TC',
  'MTC',
  'Data Sheet',
  'NA',
];
const YES_NO = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

/* ── Interfaces ─────────────────────────────────────────────────────────── */
interface ProjectMaster {
  id: number;
  projectId: string;
  projectCode: string;
  projectName: string;
}

interface ItemMaster {
  id: string;
  itemCode: string;
  description: string;
  category?: string;
  subGroup?: string;
  uom: string;
}

interface ItemRow {
  id: string;
  skuCode: string;
  itemDescription: string;
  category?: string;
  subGroup?: string;
  qty: string;
  uom: string;
  technicalSpec: string;
  approvedMakes: string;
  attachmentName?: string;
  attachmentUrl?: string;
  masterItemId?: string;
}

interface FormData {
  /* S1: Requestor — all read-only from auth */
  requestorName: string;
  department: string;
  designation: string;
  employeeId: string;
  mobileNo: string;
  email: string;
  /* S2: Project */
  projectId: string;
  projectCode: string;
  projectName: string;
  /* S3: Indent */
  application: string;
  itemType: string;
  priority: string;
  requiredByDate: string;
  indentRemarks: string;
  /* S5: Requirements */
  paintingSpecRemark: string;
  warranty: string;
  inspectionRequired: string;
  packingRemarks: string;
  /* S6: Documents */
  certification: string;
  manuals: string;
  ga: string;
  docRemarks: string;
}

const BLANK_FORM: FormData = {
  requestorName: '',
  department: '',
  designation: '',
  employeeId: '',
  mobileNo: '',
  email: '',
  projectId: '',
  projectCode: '',
  projectName: '',
  application: '',
  itemType: '',
  priority: 'NORMAL',
  requiredByDate: '',
  indentRemarks: '',
  paintingSpecRemark: '',
  warranty: '12 Months',
  inspectionRequired: 'Yes',
  packingRemarks: '',
  certification: '',
  manuals: '',
  ga: '',
  docRemarks: '',
};

const BLANK_ITEM: Omit<ItemRow, 'id'> = {
  skuCode: '',
  itemDescription: '',
  category: '',
  subGroup: '',
  qty: '',
  uom: 'pcs',
  technicalSpec: '',
  approvedMakes: '',
  attachmentName: '',
  attachmentUrl: '',
};

/* ── Sub-components ─────────────────────────────────────────────────────── */
function SectionCard({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ifh-card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface2)',
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            backgroundColor: 'var(--primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {num}
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={FIELD}>
      <label style={LABEL}>
        {label}
        {required && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function ReadonlyInput({
  value,
  placeholder,
}: {
  value: string;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      readOnly
      placeholder={placeholder ?? '—'}
      style={INPUT_DISABLED}
      tabIndex={-1}
    />
  );
}

function FocusInput({
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  error?: boolean;
}) {
  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        ...INPUT_BASE,
        borderColor: error ? '#DC2626' : 'var(--border)',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--primary)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,123,69,0.10)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = error ? '#DC2626' : 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
}

function TextareaField({
  name,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={TEXTAREA_BASE}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--primary)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,123,69,0.10)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    />
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
function NewIndentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftId = searchParams.get('draftId');
  const { user } = useAuth();

  /* master data — server-side search */
  const [projects, setProjects] = useState<ProjectMaster[]>([]);
  const [items, setItemMaster] = useState<ItemMaster[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const masterLoading = projectsLoading || itemsLoading;

  /* form state */
  const [form, setForm] = useState<FormData>(BLANK_FORM);
  const [rows, setRows] = useState<ItemRow[]>([{ id: '1', ...BLANK_ITEM }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);

  /* Print/PDF refs */
  const printRef = useRef<HTMLDivElement>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  /* ── Removed redundant load projects + items (Now handled by components directly) ────────────────────────── */

  /* ── Pre-fill requestor from auth ──────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      requestorName: user.name ?? '',
      email: user.email ?? '',
      employeeId: user.employeeId ?? '',
      designation: user.designation ?? '',
      mobileNo: user.phone ?? '',
      department: user.departmentId ?? '',
    }));
  }, [user]);

  /* ── Derived option lists (Removed unused project/item lists) ───────────────────────────────────────────────── */

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const setField = useCallback((name: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setField(e.target.name as keyof FormData, e.target.value);

  const handleSelectChange = (e: { target: { name: string; value: string } }) =>
    setField(e.target.name as keyof FormData, e.target.value);

  /* Project selection — auto-fill name */
  const onProjectSelect = (projectId: string, opt: ProjectOption | null) => {
    setForm((prev) => ({
      ...prev,
      projectId: projectId,
      projectCode: opt?.projectId ?? projectId,
      projectName: opt?.projectName ?? '',
    }));
    setErrors((prev) => ({ ...prev, projectId: '' }));
  };

  /* SKU selection for an item row — auto-fill from enterprise SKU picker */
  const onSkuSelect = useCallback(
    (rowId: string, skuCode: string, option: any = null) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId
            ? {
                ...r,
                skuCode,
                // SkuOption uses `itemName` for the description (= SKU.description)
                itemDescription:
                  option?.itemName ??
                  option?.description ??
                  option?.itemDescription ??
                  r.itemDescription,
                category: option?.category ?? r.category,
                subGroup: option?.subGroup ?? r.subGroup,
                // SkuOption uses `uom` and `unit` interchangeably
                uom: option?.uom ?? option?.unit ?? r.uom,
                technicalSpec: r.technicalSpec,
                approvedMakes: r.approvedMakes,
                masterItemId: option?.id ?? r.masterItemId,
              }
            : r
        )
      );
      setErrors((prev) => ({ ...prev, [`sku_${rowId}`]: '' }));
    },
    []
  );

  const setRowField = (id: string, field: keyof ItemRow, value: string) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );

  const addRow = () =>
    setRows((prev) => [...prev, { id: String(Date.now()), ...BLANK_ITEM }]);

  const removeRow = (id: string) => {
    if (rows.length > 1) setRows((prev) => prev.filter((r) => r.id !== id));
  };

  /* ── Validation ─────────────────────────────────────────────────────────── */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.projectId) e.projectId = 'Required';
    if (!form.application) e.application = 'Required';
    if (!form.itemType) e.itemType = 'Required';
    if (!form.requiredByDate) e.requiredByDate = 'Required';
    if (!form.certification) e.certification = 'Required';
    if (!form.manuals) e.manuals = 'Required';
    if (!form.ga) e.ga = 'Required';
    rows.forEach((row) => {
      if (!row.skuCode.trim()) e[`sku_${row.id}`] = 'Required';
      const qty = parseFloat(row.qty);
      if (!Number.isFinite(qty) || qty <= 0) e[`qty_${row.id}`] = 'Qty > 0';
      if (!row.uom) e[`uom_${row.id}`] = 'Required';
    });
    return e;
  };

  /* ── Payload ────────────────────────────────────────────────────────────── */
  const buildPayload = (submit: boolean) => ({
    title: `${form.projectName || form.projectCode} — ${form.application}`,
    description:
      form.indentRemarks ||
      `${form.application} materials for ${form.projectName}`,
    projectId: form.projectId,
    projectName: form.projectName,
    application: form.application,
    itemType: form.itemType,
    priority: form.priority,
    requiredDate: form.requiredByDate || undefined,
    paintingSpecRemark: form.paintingSpecRemark || undefined,
    packingRequirement: form.packingRemarks || undefined,
    certification: form.certification || undefined,
    manuals: form.manuals || undefined,
    warrantyGuarantee: form.warranty || undefined,
    ga: form.ga || undefined,
    submit,
    items: rows.map((r) => ({
      itemCode: r.skuCode,
      itemName: r.itemDescription || r.skuCode,
      description: r.itemDescription || r.skuCode,
      unit: r.uom,
      quantity: isNaN(parseFloat(r.qty)) ? 1 : parseFloat(r.qty),
      technicalSpec: r.technicalSpec || undefined,
      approvedMakes: r.approvedMakes || undefined,
      attachmentName: r.attachmentName || undefined,
      attachmentUrl: r.attachmentUrl || undefined,
    })),
  });

  const handleSaveDraft = async () => {
    setDraftLoading(true);
    setErrors({});
    try {
      if (draftId) {
        await apiFetch(`/procurement/${draftId}/draft`, {
          method: 'POST',
          body: JSON.stringify(buildPayload(false)),
        });
      } else {
        await createProcurement(buildPayload(false));
      }
      router.push('/indents');
    } catch (err: any) {
      setErrors({ submit: err?.message || 'Failed to save draft.' });
    } finally {
      setDraftLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      if (draftId) {
        await apiFetch(`/procurement/${draftId}/draft`, {
          method: 'POST',
          body: JSON.stringify(buildPayload(true)),
        });
      } else {
        await createProcurement(buildPayload(true));
      }
      router.push('/indent-verification');
    } catch (err: any) {
      setErrors({
        submit:
          err?.message ||
          'Failed to create indent. Please check all fields and try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  /* ── Print / PDF Actions ────────────────────────────────────────────────── */
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setPdfGenerating(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);
      const element = printRef.current;
      // Ensure element is visible briefly for html2canvas
      const origStyle = element.style.display;
      element.style.display = 'block';

      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(
        `Indent_${form.projectCode || 'Draft'}_${new Date().toISOString().split('T')[0]}.pdf`
      );

      element.style.display = origStyle;
    } catch (err) {
      console.error('PDF Generation failed', err);
    } finally {
      setPdfGenerating(false);
    }
  };

  /* ── Table cell style ───────────────────────────────────────────────────── */
  const tbl: React.CSSProperties = {
    height: 32,
    padding: '0 8px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--card)',
    color: 'var(--text-primary)',
    fontSize: 12,
    fontFamily: 'var(--font-sans)',
    outline: 'none',
    width: '100%',
  };
  const tblDisabled: React.CSSProperties = {
    ...tbl,
    backgroundColor: 'var(--surface2)',
    color: 'var(--text-secondary)',
    cursor: 'not-allowed',
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="page-content" style={{ paddingBottom: 60 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 transition-colors"
            style={{
              color: 'var(--primary)',
              backgroundColor: 'none',
              border: 'none',
              cursor: 'pointer',
              marginBottom: 12,
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 600,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = 'var(--primary-dark)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'var(--primary)')
            }
          >
            <ArrowLeft style={{ width: 15, height: 15 }} /> Back to Indents
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1
                className="font-display"
                style={{
                  fontSize: 24,
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.015em',
                  lineHeight: 1.2,
                }}
              >
                {draftId ? 'Edit Indent Draft' : 'Create New Indent'}
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  marginTop: 5,
                }}
              >
                Complete all required sections and submit for verification
              </p>
            </div>
            <div
              className="hidden md:flex items-center gap-1"
              style={{ fontSize: 11, color: 'var(--text-muted)' }}
            >
              {[
                'Requestor',
                'Project',
                'Indent',
                'Items',
                'Requirements',
                'Documents',
              ].map((s, i) => (
                <span key={s} className="flex items-center gap-1">
                  {i > 0 && (
                    <ChevronRight
                      style={{ width: 11, height: 11, opacity: 0.4 }}
                    />
                  )}
                  <span style={{ fontWeight: 600 }}>§{i + 1}</span>
                  <span className="hidden sm:inline">{s}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
        >
          {/* ── §1 Requestor — all read-only from authenticated profile ── */}
          <SectionCard num={1} title="Requestor Information">
            <div
              style={{
                marginBottom: 10,
                padding: '8px 12px',
                borderRadius: 8,
                backgroundColor: 'rgba(15,123,69,0.06)',
                border: '1px solid rgba(15,123,69,0.15)',
                fontSize: 11,
                color: 'var(--primary)',
                fontWeight: 600,
              }}
            >
              Auto-populated from your user profile — not editable
            </div>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              style={{ gap: 16 }}
            >
              <Field label="Employee Name">
                <ReadonlyInput
                  value={form.requestorName}
                  placeholder="Loading…"
                />
              </Field>
              <Field label="Email Address">
                <ReadonlyInput value={form.email} placeholder="—" />
              </Field>
              <Field label="Phone / Mobile">
                <ReadonlyInput value={form.mobileNo} placeholder="—" />
              </Field>
            </div>
          </SectionCard>

          {/* ── §2 Project — searchable dropdown, auto-fills name + site ── */}
          <SectionCard num={2} title="Project Information">
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              style={{ gap: 16 }}
            >
              <Field label="Project ID" required>
                <ProjectSelect
                  name="projectId"
                  value={form.projectId}
                  onChange={onProjectSelect}
                  placeholder="Select Project"
                  error={!!errors.projectId}
                />
                {errors.projectId && (
                  <span style={{ fontSize: 11, color: '#DC2626' }}>
                    {errors.projectId}
                  </span>
                )}
              </Field>
              <Field label="Project Name">
                <ReadonlyInput
                  value={form.projectName}
                  placeholder="Auto-filled on selection"
                />
              </Field>
            </div>
          </SectionCard>

          {/* ── §3 Indent Information ── */}
          <SectionCard num={3} title="Indent Information">
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              style={{ gap: 16 }}
            >
              <Field label="Application" required>
                <CustomSelect
                  name="application"
                  value={form.application}
                  onChange={handleSelectChange}
                  options={APPLICATIONS.map((a) => ({ value: a, label: a }))}
                  placeholder="Select Application"
                  error={!!errors.application}
                />
                {errors.application && (
                  <span style={{ fontSize: 11, color: '#DC2626' }}>
                    {errors.application}
                  </span>
                )}
              </Field>
              <Field label="Item Type" required>
                <CustomSelect
                  name="itemType"
                  value={form.itemType}
                  onChange={handleSelectChange}
                  options={ITEM_TYPES.map((t) => ({ value: t, label: t }))}
                  placeholder="Select Item Type"
                  error={!!errors.itemType}
                />
                {errors.itemType && (
                  <span style={{ fontSize: 11, color: '#DC2626' }}>
                    {errors.itemType}
                  </span>
                )}
              </Field>
              <Field label="Priority">
                <CustomSelect
                  name="priority"
                  value={form.priority}
                  onChange={handleSelectChange}
                  options={PRIORITIES.map((p) => ({ value: p, label: p }))}
                  placeholder="Select Priority"
                />
              </Field>
              <Field label="Required By Date" required>
                <input
                  type="date"
                  name="requiredByDate"
                  value={form.requiredByDate}
                  onChange={handleChange}
                  style={{
                    ...INPUT_BASE,
                    borderColor: errors.requiredByDate
                      ? '#DC2626'
                      : 'var(--border)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow =
                      '0 0 0 3px rgba(15,123,69,0.10)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = errors.requiredByDate
                      ? '#DC2626'
                      : 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {errors.requiredByDate && (
                  <span style={{ fontSize: 11, color: '#DC2626' }}>
                    {errors.requiredByDate}
                  </span>
                )}
              </Field>
              <div style={{ gridColumn: 'span 2' }}>
                <Field label="Indent Remarks">
                  <TextareaField
                    name="indentRemarks"
                    value={form.indentRemarks}
                    onChange={handleChange}
                    placeholder="Purpose of indent, scope of work, any special notes…"
                    rows={2}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          {/* ── §4 Item Details — SKU typeahead + auto-fill ── */}
          <SectionCard num={4} title="Item Details">
            {masterLoading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 12,
                  fontSize: 12,
                  color: 'var(--text-muted)',
                }}
              >
                <Loader2
                  style={{ width: 13, height: 13 }}
                  className="animate-spin"
                />{' '}
                Loading item master…
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table className="ifh-table">
                <thead>
                  <tr
                    style={{
                      borderBottom: '2px solid var(--border-strong)',
                      backgroundColor: 'var(--surface2)',
                    }}
                  >
                    {[
                      '#',
                      'SKU Code *',
                      'Item Description',
                      'Qty *',
                      'UOM *',
                      'Technical Specification',
                      'Approved Makes',
                      'Attachment',
                      '',
                    ].map((h, i) => (
                      <th
                        key={i}
                        style={{
                          padding: '8px 10px',
                          textAlign: 'left',
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: 'var(--text-muted)',
                          whiteSpace: 'nowrap',
                          minWidth: i === 3 ? 120 : undefined,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td
                        style={{
                          padding: '8px 10px',
                          fontSize: 12,
                          color: 'var(--text-muted)',
                          width: 30,
                        }}
                      >
                        {idx + 1}
                      </td>

                      {/* SKU — searchable typeahead */}
                      <td style={{ padding: '6px 6px', minWidth: 240 }}>
                        <EnterpriseSkuSelect
                          value={row.skuCode}
                          onChange={(v, opt) => onSkuSelect(row.id, v, opt)}
                          projectId={form.projectId}
                          placeholder="Search SKU…"
                          error={!!errors[`sku_${row.id}`]}
                        />
                        {errors[`sku_${row.id}`] && (
                          <span style={{ fontSize: 10, color: '#DC2626' }}>
                            {errors[`sku_${row.id}`]}
                          </span>
                        )}
                      </td>

                      {/* Item Description — auto-filled, editable */}
                      <td style={{ padding: '6px 6px', minWidth: 180 }}>
                        <input
                          value={row.itemDescription}
                          onChange={(e) =>
                            setRowField(
                              row.id,
                              'itemDescription',
                              e.target.value
                            )
                          }
                          style={tbl}
                          placeholder="Auto-fills from SKU"
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor =
                              'var(--primary)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }}
                        />
                      </td>

                      {/* Qty */}
                      <td style={{ padding: '6px 6px', width: 120 }}>
                        <input
                          type="number"
                          value={row.qty}
                          min="0"
                          step="any"
                          onChange={(e) =>
                            setRowField(row.id, 'qty', e.target.value)
                          }
                          style={{
                            ...tbl,
                            borderColor: errors[`qty_${row.id}`]
                              ? '#DC2626'
                              : 'var(--border)',
                            width: '100%',
                            minWidth: 100,
                          }}
                          placeholder="0.000"
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor =
                              'var(--primary)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = errors[
                              `qty_${row.id}`
                            ]
                              ? '#DC2626'
                              : 'var(--border)';
                          }}
                        />
                        {errors[`qty_${row.id}`] && (
                          <span
                            style={{
                              fontSize: 10,
                              color: '#DC2626',
                              display: 'block',
                            }}
                          >
                            {errors[`qty_${row.id}`]}
                          </span>
                        )}
                      </td>

                      {/* UOM — auto-filled, dropdown */}
                      <td style={{ padding: '6px 6px', width: 90 }}>
                        <select
                          value={row.uom}
                          onChange={(e) =>
                            setRowField(row.id, 'uom', e.target.value)
                          }
                          style={{
                            ...tbl,
                            borderColor: errors[`uom_${row.id}`]
                              ? '#DC2626'
                              : 'var(--border)',
                          }}
                        >
                          {UOMS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Technical Spec — auto-filled, editable */}
                      <td style={{ padding: '6px 6px', minWidth: 200 }}>
                        <input
                          value={row.technicalSpec}
                          onChange={(e) =>
                            setRowField(row.id, 'technicalSpec', e.target.value)
                          }
                          style={tbl}
                          placeholder="Auto-fills from master"
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor =
                              'var(--primary)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }}
                        />
                      </td>

                      {/* Approved Makes — auto-filled, editable */}
                      <td style={{ padding: '6px 6px', minWidth: 160 }}>
                        <input
                          value={row.approvedMakes}
                          onChange={(e) =>
                            setRowField(row.id, 'approvedMakes', e.target.value)
                          }
                          style={tbl}
                          placeholder="Auto-fills from master"
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor =
                              'var(--primary)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }}
                        />
                      </td>

                      {/* Attachment */}
                      <td style={{ padding: '6px 6px', minWidth: 140 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          {row.attachmentName ? (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                maxWidth: 120,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: 'var(--text-primary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                                title={row.attachmentName}
                              >
                                {row.attachmentName}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setRowField(row.id, 'attachmentName', '');
                                  setRowField(row.id, 'attachmentUrl', '');
                                }}
                                style={{
                                  padding: 2,
                                  backgroundColor: 'none',
                                  border: 'none',
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                }}
                              >
                                <X style={{ width: 13, height: 13 }} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                document
                                  .getElementById(`file-input-${row.id}`)
                                  ?.click()
                              }
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                              style={{
                                height: 28,
                                fontSize: 11,
                                cursor: 'pointer',
                                fontFamily: 'var(--font-sans)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Paperclip style={{ width: 12, height: 12 }} />
                              Upload
                            </button>
                          )}
                          <input
                            id={`file-input-${row.id}`}
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = URL.createObjectURL(file);
                                setRowField(
                                  row.id,
                                  'attachmentName',
                                  file.name
                                );
                                setRowField(row.id, 'attachmentUrl', url);
                              }
                            }}
                            accept=".pdf,.xls,.xlsx,.doc,.docx,.png,.jpg,.jpeg"
                            style={{ display: 'none' }}
                          />
                        </div>
                      </td>

                      {/* Remove row */}
                      <td style={{ padding: '6px 6px', width: 36 }}>
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length === 1}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            backgroundColor: 'transparent',
                            border: '1px solid var(--border)',
                            color: '#DC2626',
                            cursor:
                              rows.length === 1 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: rows.length === 1 ? 0.35 : 1,
                          }}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={addRow}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 12,
                height: 34,
                padding: '0 14px',
                borderRadius: 8,
                backgroundColor: 'var(--primary-light)',
                border: '1px solid rgba(15,123,69,0.2)',
                color: 'var(--primary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <Plus style={{ width: 13, height: 13 }} /> Add Item Row
            </button>
          </SectionCard>

          {/* ── §5 Common Requirements ── */}
          <SectionCard num={5} title="Common Requirements">
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              style={{ gap: 16 }}
            >
              <div style={{ gridColumn: 'span 2' }}>
                <Field label="Painting Specification Remark">
                  <FocusInput
                    name="paintingSpecRemark"
                    value={form.paintingSpecRemark}
                    onChange={handleChange}
                    placeholder="e.g. 2 coats Epoxy Primer + 1 coat Enamel finish, DFT 100 microns…"
                  />
                </Field>
              </div>
              <Field label="Warranty">
                <CustomSelect
                  name="warranty"
                  value={form.warranty}
                  onChange={handleSelectChange}
                  options={WARRANTY_OPTS.map((w) => ({ value: w, label: w }))}
                  placeholder="Select Warranty"
                />
              </Field>
              <Field label="Inspection Required">
                <CustomSelect
                  name="inspectionRequired"
                  value={form.inspectionRequired}
                  onChange={handleSelectChange}
                  options={[
                    { value: 'Yes', label: 'Yes' },
                    { value: 'No', label: 'No' },
                    { value: 'Third Party', label: 'Third Party' },
                  ]}
                  placeholder="Select"
                />
              </Field>
              <Field label="Packing & Marking Remarks">
                <FocusInput
                  name="packingRemarks"
                  value={form.packingRemarks}
                  onChange={handleChange}
                  placeholder="Special packing instructions"
                />
              </Field>
            </div>
          </SectionCard>

          {/* ── §6 Document Requirements — controlled dropdowns only ── */}
          <SectionCard num={6} title="Document Requirements">
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              style={{ gap: 16 }}
            >
              <Field label="Certification" required>
                <CustomSelect
                  name="certification"
                  value={form.certification}
                  onChange={handleSelectChange}
                  options={CERT_OPTS.map((c) => ({ value: c, label: c }))}
                  placeholder="Select Certification"
                  error={!!errors.certification}
                />
                {errors.certification && (
                  <span style={{ fontSize: 11, color: '#DC2626' }}>
                    {errors.certification}
                  </span>
                )}
              </Field>
              <Field label="Manuals" required>
                <CustomSelect
                  name="manuals"
                  value={form.manuals}
                  onChange={handleSelectChange}
                  options={YES_NO}
                  placeholder="Select"
                  error={!!errors.manuals}
                />
                {errors.manuals && (
                  <span style={{ fontSize: 11, color: '#DC2626' }}>
                    {errors.manuals}
                  </span>
                )}
              </Field>
              <Field label="GA (General Arrangement)" required>
                <CustomSelect
                  name="ga"
                  value={form.ga}
                  onChange={handleSelectChange}
                  options={YES_NO}
                  placeholder="Select"
                  error={!!errors.ga}
                />
                {errors.ga && (
                  <span style={{ fontSize: 11, color: '#DC2626' }}>
                    {errors.ga}
                  </span>
                )}
              </Field>
              <div style={{ gridColumn: 'span 3' }}>
                <Field label="Document Remarks">
                  <TextareaField
                    name="docRemarks"
                    value={form.docRemarks}
                    onChange={handleChange}
                    placeholder="Any additional documentation requirements…"
                    rows={2}
                  />
                </Field>
              </div>
            </div>
          </SectionCard>

          {/* ── Error banner ── */}
          {errors.submit && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                backgroundColor: 'rgba(220,38,38,0.08)',
                border: '1px solid rgba(220,38,38,0.2)',
                color: '#DC2626',
                fontSize: 13,
              }}
            >
              {errors.submit}
            </div>
          )}

          {/* ── Actions (Sticky Footer) ── */}
          <div
            style={{
              position: 'sticky',
              bottom: 0,
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              backgroundColor: 'var(--card)',
              borderTop: '1px solid var(--border)',
              borderRadius: '0 0 12px 12px',
              boxShadow: '0 -4px 12px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={handlePrint}
                className="ifh-btn-ghost"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Printer style={{ width: 14, height: 14 }} />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfGenerating}
                className="ifh-btn-ghost"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {pdfGenerating ? (
                  <Loader2
                    style={{ width: 14, height: 14 }}
                    className="animate-spin"
                  />
                ) : (
                  <Download style={{ width: 14, height: 14 }} />
                )}
                <span className="hidden sm:inline">
                  {pdfGenerating ? 'Generating...' : 'Download PDF'}
                </span>
              </button>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={draftLoading || loading}
                className="ifh-btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={draftLoading || loading}
                className="ifh-btn-secondary"
                style={{ opacity: draftLoading || loading ? 0.7 : 1 }}
              >
                {draftLoading && (
                  <Loader2
                    style={{ width: 14, height: 14 }}
                    className="animate-spin"
                  />
                )}
                {draftLoading ? 'Saving…' : 'Save Draft'}
              </button>
              <button
                type="submit"
                disabled={loading || draftLoading}
                className="ifh-btn-primary"
                style={{ opacity: loading || draftLoading ? 0.7 : 1 }}
              >
                {loading && (
                  <Loader2
                    style={{ width: 14, height: 14 }}
                    className="animate-spin"
                  />
                )}
                {loading ? 'Submitting…' : 'Submit Indent'}
              </button>
            </div>
          </div>
        </form>

        {/* Hidden Printable Component */}
        <div style={{ display: 'none' }}>
          <PrintableIndent
            ref={printRef}
            form={form}
            rows={rows}
            referenceNo={draftId ? `DRAFT-${draftId}` : undefined}
          />
        </div>
      </div>
    </div>
  );
}

export default function NewIndentPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="animate-spin text-[var(--primary)]" />
        </div>
      }
    >
      <NewIndentForm />
    </Suspense>
  );
}
