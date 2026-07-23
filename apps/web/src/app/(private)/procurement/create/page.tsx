'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  FileText,
  Package,
  ClipboardList,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  X,
  RotateCcw,
  Send,
  Paperclip,
  Calendar,
} from 'lucide-react';
import { createProcurement } from '@/lib/api/procurement';
import { apiFetch } from '@/lib/api/fetch';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ProjectSelect } from '@/components/ui/project-select';
import { EnterpriseSkuSelect } from '@/components/ui/enterprise-sku-select';

// ─── Design System Tokens ────────────────────────────────────────────────────

const INPUT =
  'w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45] transition-all';

const INPUT_READONLY =
  'w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-[14px] text-gray-600 placeholder:text-gray-400 cursor-not-allowed select-none';

const INPUT_ERROR =
  'w-full h-11 px-4 rounded-xl border border-red-300 bg-white text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all';

const TEXTAREA =
  'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45] transition-all resize-none';

const SELECT =
  'w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45] transition-all appearance-none cursor-pointer';

const LABEL = 'block text-[13px] font-semibold text-gray-700 mb-2';
const LABEL_OPT =
  'block text-[13px] font-semibold text-gray-700 mb-2 after:content-["(optional)"] after:ml-1.5 after:text-[11px] after:font-normal after:text-gray-400';

// ─── Static Reference Data ───────────────────────────────────────────────────

const PROJECTS = [
  {
    id: 'PROJ-2026-001',
    name: 'SSPCL Singrauli',
    sites: ['Singrauli – Unit 1', 'Singrauli – Unit 2'],
  },
  {
    id: 'PROJ-2026-002',
    name: 'NTPC Vindhyachal',
    sites: ['Vindhyachal – Stage IV', 'Vindhyachal – Stage V'],
  },
  {
    id: 'PROJ-2026-003',
    name: 'Adani Mundra',
    sites: ['Mundra – Boiler Area', 'Mundra – TG Area'],
  },
  {
    id: 'PROJ-2026-004',
    name: 'CESC Budge Budge',
    sites: ['Budge Budge – Unit 1'],
  },
  {
    id: 'PROJ-2026-005',
    name: 'JSW Ratnagiri',
    sites: ['Ratnagiri – Phase 1', 'Ratnagiri – Phase 2'],
  },
];

const APPLICATIONS = ['ESP', 'Bag Filter', 'Process Bag Filter', 'NA'];

const ITEM_TYPES = [
  'Ready-Made',
  'Tailor-Made',
  'Market Item',
  'Provisional Item',
  'Manufacturing/Machining',
];

const UOMS = [
  'Nos',
  'Set',
  'Lot',
  'KG',
  'MT',
  'Ton',
  'MTR',
  'RMT',
  'SQM',
  'CUM',
  'LTR',
  'Pair',
  'Box',
  'Roll',
  'Length',
  'Job',
];

const SKU_MASTER = [
  {
    code: 'SKU-EL-001',
    name: 'Cable Tray — 100mm Wide, 3mm GI',
    bbu: 'BBU-001',
    unit: 'Mtr',
    technicalSpec: '',
    approvedMakes: '',
  },
  {
    code: 'SKU-EL-002',
    name: 'Cable Tray — 200mm Wide, 3mm GI',
    bbu: 'BBU-002',
    unit: 'Mtr',
    technicalSpec: '',
    approvedMakes: '',
  },
  {
    code: 'SKU-MS-001',
    name: 'MS Plate — IS 2062 Gr E250, 8mm',
    bbu: 'BBU-010',
    unit: 'Kg',
    technicalSpec: '',
    approvedMakes: '',
  },
  {
    code: 'SKU-MS-002',
    name: 'MS Plate — IS 2062 Gr E250, 12mm',
    bbu: 'BBU-011',
    unit: 'Kg',
    technicalSpec: '',
    approvedMakes: '',
  },
  {
    code: 'SKU-PI-001',
    name: 'ERW Pipe — 2" Sch 40, IS 1239',
    bbu: 'BBU-020',
    unit: 'Mtr',
    technicalSpec: '',
    approvedMakes: '',
  },
  {
    code: 'SKU-PI-002',
    name: 'ERW Pipe — 4" Sch 40, IS 1239',
    bbu: 'BBU-021',
    unit: 'Mtr',
    technicalSpec: '',
    approvedMakes: '',
  },
  {
    code: 'SKU-VL-001',
    name: 'Gate Valve — 2" PN16 Cast Steel',
    bbu: 'BBU-030',
    unit: 'Nos',
    technicalSpec: '',
    approvedMakes: '',
  },
  {
    code: 'SKU-VL-002',
    name: 'Ball Valve — 1" PN40 SS316',
    bbu: 'BBU-031',
    unit: 'Nos',
    technicalSpec: '',
    approvedMakes: '',
  },
  {
    code: 'SKU-BO-001',
    name: 'Fastener Set — M16×60 HT Grade 8.8',
    bbu: 'BBU-040',
    unit: 'Set',
    technicalSpec: '',
    approvedMakes: '',
  },
  {
    code: 'SKU-BO-002',
    name: 'Fastener Set — M20×80 HT Grade 8.8',
    bbu: 'BBU-041',
    unit: 'Set',
    technicalSpec: '',
    approvedMakes: '',
  },
];

const CERTIFICATIONS = [
  'Internal Records',
  'Client Verification',
  'TC',
  'MTC',
  'Data Sheet',
  'NA',
];

const MANUALS_OPTIONS = ['Yes', 'No'];

const WARRANTY_OPTIONS = [
  'Not Applicable',
  '6 Months',
  '12 Months',
  '18 Months',
  '24 Months',
  '36 Months',
];

const GA_OPTIONS = ['Yes', 'No'];

// ─── Types ───────────────────────────────────────────────────────────────────

interface ItemRow {
  id: string;
  skuCode: string;
  itemName: string;
  bbuCode: string;
  qty: string;
  uom: string;
  technicalSpec: string;
  approvedMakes: string;
  attachment: File | null;
  errors: Partial<Record<string, string>>;
}

interface FormErrors {
  projectId?: string;
  application?: string;
  itemType?: string;
  requiredDate?: string;
  paintingSpecRemark?: string;
  packingRequirement?: string;
  certification?: string;
  manuals?: string;
  warrantyGuarantee?: string;
  ga?: string;
  items?: string;
}

const newItemRow = (): ItemRow => ({
  id: crypto.randomUUID(),
  skuCode: '',
  itemName: '',
  bbuCode: '',
  qty: '',
  uom: '',
  technicalSpec: '',
  approvedMakes: '',
  attachment: null,
  errors: {},
});

// ─── Toast Component ─────────────────────────────────────────────────────────

function Toast({
  type,
  message,
  onClose,
}: {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-24 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg border text-[14px] font-semibold transition-all
        ${
          type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}
    >
      {type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
      )}
      {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  number,
  title,
  subtitle,
}: {
  icon: any;
  number: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-4 mb-6">
      <div className="w-9 h-9 rounded-xl bg-[#0F7B45]/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4.5 h-4.5 text-[#0F7B45]" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0F7B45]">
            Section {number}
          </span>
        </div>
        <h2 className="text-[16px] font-semibold text-gray-900 leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[12px] text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

// ─── Field Error ─────────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-[12px] text-red-600 font-medium mt-1.5">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {message}
    </p>
  );
}

// ─── Select with chevron ─────────────────────────────────────────────────────

function SelectField({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  error,
  disabled,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[] | { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}) {
  const cls = error
    ? SELECT.replace('border-gray-200', 'border-red-300') + ' ring-red-200'
    : SELECT;
  return (
    <div className={`relative ${className ?? ''}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cls + (disabled ? ' opacity-50 cursor-not-allowed' : '')}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) =>
          typeof opt === 'string' ? (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ) : (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          )
        )}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CreateIndentPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const sessionUser = {
    fullName: authUser?.name ?? '',
    name: authUser?.name ?? '',
    email: authUser?.email ?? '',
  };

  // ── Live projects master (server-side search) ─────────────────────────────
  const [liveProjects, setLiveProjects] = useState<
    Array<{
      id: number;
      projectId: string;
      projectCode: string;
      projectName: string;
    }>
  >([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProjects = async (retries = 0) => {
      try {
        setProjectsLoading(true);
        const raw = await apiFetch('/projects?take=25');
        const arr: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
        if (isMounted) {
          setLiveProjects(
            arr.map((p: any) => ({
              id: p.id ?? 0,
              projectId: p.projectId ?? p.projectCode ?? '',
              projectCode: p.projectCode ?? p.projectId ?? '',
              projectName: p.projectName ?? '',
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
        if (retries < 1) {
          setTimeout(() => loadProjects(retries + 1), 1000);
        } else if (isMounted) {
          setLiveProjects([]);
        }
      } finally {
        if (isMounted) setProjectsLoading(false);
      }
    };

    const loadItems = async (retries = 0) => {
      try {
        setItemsLoading(true);
        const raw = await apiFetch('/skus?take=25');
        const arr: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
        if (isMounted) {
          setLiveSKUs(
            arr.map((i: any) => ({
              id: i.id ?? '',
              itemCode: i.itemCode ?? '',
              description: i.description ?? '',
              uom: i.uom ?? '',
              category: i.category ?? '',
              subGroup: i.subGroup ?? '',
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load items:', err);
        if (retries < 1) {
          setTimeout(() => loadItems(retries + 1), 1000);
        } else if (isMounted) {
          setLiveSKUs([]);
        }
      } finally {
        if (isMounted) setItemsLoading(false);
      }
    };

    loadProjects();
    loadItems();

    return () => {
      isMounted = false;
    };
  }, []);

  const searchProjects = useCallback((q: string) => {
    setProjectsLoading(true);
    const url = q.trim()
      ? `/projects/search?q=${encodeURIComponent(q)}&limit=25`
      : '/projects?take=25';
    apiFetch(url)
      .catch(() => [])
      .then((raw: any) => {
        const arr: any[] = Array.isArray(raw)
          ? raw
          : (raw?.items ?? raw?.data ?? []);
        setLiveProjects(
          arr.map((p: any) => ({
            id: p.id ?? 0,
            projectId: p.projectId ?? p.projectCode ?? '',
            projectCode: p.projectCode ?? p.projectId ?? '',
            projectName: p.projectName ?? '',
          }))
        );
      })
      .finally(() => setProjectsLoading(false));
  }, []);

  // ── Live items master (server-side search) ────────────────────────────────
  const [liveSKUs, setLiveSKUs] = useState<
    Array<{
      id: string;
      itemCode: string;
      description: string;
      uom: string;
      category?: string;
      subGroup?: string;
    }>
  >([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const searchItems = useCallback((q: string) => {
    setItemsLoading(true);
    const url = q.trim()
      ? `/skus/search?q=${encodeURIComponent(q)}&limit=25`
      : '/skus?take=25';
    apiFetch(url)
      .catch(() => [])
      .then((raw: any) => {
        const arr: any[] = Array.isArray(raw) ? raw : (raw?.data ?? []);
        setLiveSKUs(
          arr.map((i: any) => ({
            id: i.id ?? '',
            itemCode: i.itemCode ?? '',
            description: i.description ?? '',
            uom: i.uom ?? '',
            category: i.category ?? '',
            subGroup: i.subGroup ?? '',
          }))
        );
      })
      .finally(() => setItemsLoading(false));
  }, []);

  const projectOptions = liveProjects.map((p) => ({
    value: p.projectId || p.projectCode,
    label: p.projectId || p.projectCode,
    sublabel: p.projectName,
  }));

  const itemOptions = liveSKUs.map((i) => ({
    value: i.itemCode,
    label: i.itemCode,
    sublabel: i.description,
  }));

  // ── Section 1 state ───────────────────────────────────────────────────────
  const [projectId, setProjectId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [application, setApplication] = useState('');
  const [itemType, setItemType] = useState('');
  const [indentRemarks, setIndentRemarks] = useState('');

  // ── Section 2 state ───────────────────────────────────────────────────────
  const [items, setItems] = useState<ItemRow[]>([newItemRow()]);

  // ── Section 3 state ───────────────────────────────────────────────────────
  const [requiredDate, setRequiredDate] = useState('');
  const [paintingSpecRemark, setPaintingSpecRemark] = useState('');
  const [packingReq, setPackingReq] = useState('');

  // ── Section 4 state ───────────────────────────────────────────────────────
  const [sec4Open, setSec4Open] = useState(true);
  const [certification, setCertification] = useState('');
  const [manuals, setManuals] = useState('');
  const [warranty, setWarranty] = useState('');
  const [ga, setGa] = useState('');

  // ── Form meta state ───────────────────────────────────────────────────────
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // Auto-populate project name when project selected
  useEffect(() => {
    if (!projectId) {
      setProjectName('');
      return;
    }
    const proj = liveProjects.find(
      (p) => (p.projectId || p.projectCode) === projectId
    );
    if (proj) {
      setProjectName(proj.projectName);
    }
  }, [projectId, liveProjects]);

  // Mark form dirty on any change, trigger auto-save
  const markDirty = useCallback(() => {
    setIsDirty(true);
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      // Auto-save draft silently — only if we have minimum required data
      if (projectId) {
        try {
          await handleDraftSave(true);
        } catch {
          /* silent */
        }
      }
    }, 30000); // 30s debounce
  }, [projectId]);

  useEffect(() => () => clearTimeout(autoSaveRef.current), []);

  // Today's date string for min date
  const today = new Date().toISOString().split('T')[0];

  // ─── Item Table helpers ────────────────────────────────────────────────────

  const updateItem = (id: string, field: keyof ItemRow, value: any) => {
    markDirty();
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value, errors: { ...item.errors } };
        // Auto-populate from SKU
        if (field === 'skuCode') {
          const sku = liveSKUs.find((s) => s.itemCode === value);
          if (sku) {
            updated.itemName = sku.description || '';
            updated.bbuCode = '';
            updated.uom = sku.uom || '';
            updated.technicalSpec = '';
          } else if (!value) {
            updated.itemName = '';
            updated.bbuCode = '';
            updated.uom = '';
            updated.technicalSpec = '';
          }
        }
        // Clear error on change
        if (field in updated.errors) delete updated.errors[field as string];
        return updated;
      })
    );
  };

  const addItem = () => {
    markDirty();
    setItems((prev) => [...prev, newItemRow()]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    markDirty();
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const duplicateItem = (id: string) => {
    markDirty();
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx === -1) return prev;
      const copy = {
        ...prev[idx],
        id: crypto.randomUUID(),
        attachment: null,
        errors: {},
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  };

  // ─── Validation ────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!projectId) e.projectId = 'Project is required.';
    if (!application) e.application = 'Application is required.';
    if (!itemType) e.itemType = 'Item type is required.';
    if (!requiredDate) e.requiredDate = 'Required date is required.';
    if (!paintingSpecRemark.trim())
      e.paintingSpecRemark = 'Painting specification remark is required.';
    if (!packingReq.trim())
      e.packingRequirement = 'Packing requirement is required.';
    if (!certification) e.certification = 'Certification is required.';
    if (!manuals) e.manuals = 'Manuals selection is required.';
    if (!warranty) e.warrantyGuarantee = 'Warranty & Guarantee is required.';
    if (!ga) e.ga = 'GA selection is required.';

    const validItems = items.filter((i) => i.skuCode || i.itemName.trim());
    if (validItems.length === 0) e.items = 'At least one item is required.';

    // Item-level validation
    let itemsValid = true;
    setItems((prev) =>
      prev.map((item) => {
        const ie: Record<string, string> = {};
        if (!item.skuCode) ie.skuCode = 'SKU required';
        const qty = Number(item.qty);
        if (!Number.isFinite(qty) || qty <= 0) ie.qty = 'Qty > 0';
        if (!item.uom) ie.uom = 'UOM required';
        if (!item.technicalSpec.trim()) ie.technicalSpec = 'Required';
        if (!item.approvedMakes.trim()) ie.approvedMakes = 'Required';
        if (Object.keys(ie).length) itemsValid = false;
        return { ...item, errors: ie };
      })
    );

    if (!itemsValid) e.items = 'Please fix item validation errors.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ─── Build payload helper ──────────────────────────────────────────────────

  const buildPayload = (isDraft: boolean) => ({
    title: projectName
      ? `${projectName} — ${itemType || 'Procurement'}`
      : 'New Indent',
    description: indentRemarks.trim() || undefined,
    projectId,
    projectName,
    application,
    itemType,
    priority: 'NORMAL',
    requiredDate: requiredDate || undefined,
    paintingSpecRemark: paintingSpecRemark.trim() || undefined,
    packingRequirement: packingReq.trim() || undefined,
    certification: certification || undefined,
    manuals: manuals || undefined,
    warrantyGuarantee: warranty || undefined,
    ga: ga || undefined,
    submit: !isDraft,
    items: items
      .filter((i) => i.skuCode || i.itemName.trim())
      .map((item) => ({
        itemCode: item.skuCode || undefined,
        itemName: item.itemName || item.skuCode,
        description: item.itemName || item.skuCode,
        bbuCode: item.bbuCode || undefined,
        unit: item.uom || undefined,
        quantity: Number(item.qty),
        technicalSpec: item.technicalSpec.trim() || undefined,
        approvedMakes: item.approvedMakes.trim() || undefined,
        attachmentName: item.attachment ? item.attachment.name : undefined,
        attachmentUrl: item.attachment
          ? URL.createObjectURL(item.attachment)
          : undefined,
      })),
  });

  // ─── Draft save ────────────────────────────────────────────────────────────

  const handleDraftSave = async (silent = false) => {
    if (!silent) setSavingDraft(true);
    try {
      await createProcurement(buildPayload(true));
      if (!silent) {
        setIsDirty(false);
        setToast({ type: 'success', message: 'Draft saved successfully.' });
      }
    } catch (err: any) {
      if (!silent)
        setToast({
          type: 'error',
          message: err.message || 'Failed to save draft.',
        });
      throw err;
    } finally {
      if (!silent) setSavingDraft(false);
    }
  };

  // ─── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = () => {
    if (isDirty && !confirm('Discard all changes and reset the form?')) return;
    setProjectId('');
    setProjectName('');
    setApplication('');
    setItemType('');
    setIndentRemarks('');
    setItems([newItemRow()]);
    setRequiredDate('');
    setPaintingSpecRemark('');
    setPackingReq('');
    setCertification('');
    setManuals('');
    setWarranty('');
    setGa('');
    setErrors({});
    setIsDirty(false);
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setToast({
        type: 'error',
        message: 'Please fix the highlighted errors before submitting.',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSubmitting(true);
    try {
      const procurement = await createProcurement(buildPayload(false));
      setIsDirty(false);
      setToast({ type: 'success', message: 'Indent submitted successfully.' });
      setTimeout(() => router.push(`/procurement/${procurement.id}`), 800);
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.message || 'Submission failed. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8FAF9] pb-28">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="max-w-[960px] mx-auto px-8 pt-10">
        <Link
          href="/procurement"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Procurement
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0F7B45]">
              Purchase FMS — Stage 0
            </span>
            {isDirty && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                Unsaved Changes
              </span>
            )}
          </div>
          <h1 className="font-display italic font-medium text-[32px] leading-tight tracking-tight text-gray-900">
            Indent Form for Material
          </h1>
          <p className="text-[15px] text-gray-500 mt-1.5 font-medium">
            Fill out the form below to complete your purchase request.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-6">
            {/* ══════════════════════════════════════════════════════════
                SECTION 1 — REQUEST INFORMATION
            ══════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] p-8">
              <SectionHeader
                icon={FileText}
                number="1"
                title="Request Information"
                subtitle="Auto-populated fields are read-only. Select project details to continue."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                {/* Filled By */}
                <div>
                  <label className={LABEL}>Filled By</label>
                  <input
                    readOnly
                    value={
                      sessionUser.fullName || sessionUser.name || 'Loading…'
                    }
                    className={INPUT_READONLY}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Auto-populated from your account.
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label className={LABEL}>Email</label>
                  <input
                    readOnly
                    value={sessionUser.email || '—'}
                    className={INPUT_READONLY}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Auto-populated from your account.
                  </p>
                </div>

                {/* Project ID */}
                <div>
                  <label className={LABEL}>
                    Project ID <span className="text-red-500">*</span>
                  </label>
                  <ProjectSelect
                    value={projectId}
                    onChange={(v, opt) => {
                      markDirty();
                      setProjectId(v);
                      if (opt) setProjectName(opt.projectName);
                    }}
                    placeholder="Select Project"
                    error={!!errors.projectId}
                  />
                  <FieldError message={errors.projectId} />
                </div>

                {/* Project Name */}
                <div>
                  <label className={LABEL}>Project Name</label>
                  <input
                    readOnly
                    value={projectName}
                    placeholder="Auto-populated from Project ID"
                    className={INPUT_READONLY}
                  />
                </div>

                {/* Application */}
                <div>
                  <label className={LABEL}>
                    Application <span className="text-red-500">*</span>
                  </label>
                  <SelectField
                    value={application}
                    onChange={(v) => {
                      markDirty();
                      setApplication(v);
                    }}
                    options={APPLICATIONS}
                    placeholder="Select Application"
                    error={errors.application}
                  />
                  <FieldError message={errors.application} />
                </div>

                {/* Item Type */}
                <div>
                  <label className={LABEL}>
                    Item Type <span className="text-red-500">*</span>
                  </label>
                  <SelectField
                    value={itemType}
                    onChange={(v) => {
                      markDirty();
                      setItemType(v);
                    }}
                    options={ITEM_TYPES}
                    placeholder="Select Item Type"
                    error={errors.itemType}
                  />
                  <FieldError message={errors.itemType} />
                </div>

                {/* Remarks */}
                <div className="sm:col-span-2">
                  <label className={LABEL_OPT}>Remarks — Indent Raised</label>
                  <textarea
                    value={indentRemarks}
                    onChange={(e) => {
                      markDirty();
                      setIndentRemarks(e.target.value);
                    }}
                    placeholder="Additional context, urgency notes, or special instructions for this indent…"
                    rows={3}
                    className={TEXTAREA}
                  />
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                SECTION 2 — ITEM DETAILS
            ══════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] p-8">
              <div className="flex items-start justify-between mb-6">
                <SectionHeader
                  icon={Package}
                  number="2"
                  title="Item Details"
                  subtitle="Add all materials or services to be procured. At least one item is required."
                />
                <button
                  type="button"
                  onClick={addItem}
                  className="flex-shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-[#0F7B45]/8 text-[#0F7B45] text-[13px] font-semibold hover:bg-[#0F7B45]/15 transition-colors border border-[#0F7B45]/15 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>

              {errors.items && (
                <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200/70 text-[13px] text-red-700 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errors.items}
                </div>
              )}

              {/* Table — horizontal scroll on small screens */}
              <div className="overflow-x-auto -mx-8 px-8">
                <table className="w-full text-left border-collapse min-w-[1080px] ifh-table ifh-table">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {[
                        { label: 'S.No.', w: 'w-12' },
                        { label: 'SKU Code *', w: 'w-40' },
                        { label: 'Item Description', w: 'w-52' },
                        { label: 'BBU Code', w: 'w-28' },
                        { label: 'Qty *', w: 'w-20' },
                        { label: 'UOM *', w: 'w-28' },
                        { label: 'Technical Spec *', w: 'w-44' },
                        { label: 'Approved Makes *', w: 'w-36' },
                        { label: 'Attachment', w: 'w-28' },
                        { label: 'Action', w: 'w-24' },
                      ].map((col) => (
                        <th
                          key={col.label}
                          className={`${col.w} px-3 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <ItemTableRow
                        key={item.id}
                        item={item}
                        index={idx}
                        isOnly={items.length === 1}
                        onUpdate={updateItem}
                        onRemove={removeItem}
                        onDuplicate={duplicateItem}
                        skuMaster={liveSKUs}
                        itemOptions={itemOptions}
                        itemsLoading={itemsLoading}
                        searchItems={searchItems}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add row button inline */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#0F7B45] hover:text-[#0A5C34] transition-colors"
                >
                  <div className="w-6 h-6 rounded-lg border-2 border-dashed border-[#0F7B45]/30 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                  Add another item
                </button>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                SECTION 3 — PROCUREMENT REQUIREMENTS
            ══════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] p-8">
              <SectionHeader
                icon={ClipboardList}
                number="3"
                title="Procurement Requirements"
                subtitle="Specify delivery, finish, and packing requirements for this indent."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                {/* Required Date */}
                <div className="sm:col-span-2">
                  <label className={LABEL}>
                    Required Date (for all items){' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative max-w-xs">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      value={requiredDate}
                      min={today}
                      onChange={(e) => {
                        markDirty();
                        setRequiredDate(e.target.value);
                      }}
                      className={`pl-10 pr-4 ${errors.requiredDate ? INPUT_ERROR : INPUT}`}
                    />
                  </div>
                  {requiredDate && (
                    <p className="text-[12px] text-gray-500 mt-1 font-medium">
                      Required Date:{' '}
                      {new Date(requiredDate)
                        .toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                        .replace(/\//g, '-')}
                    </p>
                  )}
                  <FieldError message={errors.requiredDate} />
                </div>

                {/* Painting Specification Remark */}
                <div>
                  <label className={LABEL}>
                    Painting Specification Remark{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={paintingSpecRemark}
                    onChange={(e) => {
                      markDirty();
                      setPaintingSpecRemark(e.target.value);
                    }}
                    placeholder="e.g., 2 coats Epoxy Primer + 1 coat Enamel finish, DFT 100 microns…"
                    rows={4}
                    className={`${TEXTAREA} ${errors.paintingSpecRemark ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : ''}`}
                  />
                  <FieldError message={errors.paintingSpecRemark} />
                </div>

                {/* Packing Requirement */}
                <div>
                  <label className={LABEL}>
                    Packing Requirement <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={packingReq}
                    onChange={(e) => {
                      markDirty();
                      setPackingReq(e.target.value);
                    }}
                    placeholder="e.g., Export-grade wooden crate, moisture-proof lining, fumigation certificate required…"
                    rows={4}
                    className={`${TEXTAREA} ${errors.packingRequirement ? 'border-red-300 focus:ring-red-200 focus:border-red-400' : ''}`}
                  />
                  <FieldError message={errors.packingRequirement} />
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                SECTION 4 — DOCUMENT REQUIREMENTS
            ══════════════════════════════════════════════════════════ */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
              {/* Collapsible header */}
              <button
                type="button"
                onClick={() => setSec4Open((v) => !v)}
                className="w-full flex items-center justify-between px-8 py-5 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-[#0F7B45]/10 flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="w-4.5 h-4.5 text-[#0F7B45]" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#0F7B45]">
                        Section 4
                      </span>
                    </div>
                    <p className="text-[16px] font-semibold text-gray-900">
                      Document Requirements
                    </p>
                    <p className="text-[12px] text-gray-500 mt-0.5">
                      Certificates, manuals, warranty and drawing requirements.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[12px] font-semibold text-gray-500">
                    {sec4Open ? 'Collapse' : 'Expand'}
                  </span>
                  {sec4Open ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {sec4Open && (
                <div className="px-8 pb-8 border-t border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 pt-6">
                    {/* Certification */}
                    <div>
                      <label className={LABEL}>
                        Certification <span className="text-red-500">*</span>
                      </label>
                      <SelectField
                        value={certification}
                        onChange={(v) => {
                          markDirty();
                          setCertification(v);
                        }}
                        options={CERTIFICATIONS}
                        placeholder="Select Certification"
                        error={errors.certification}
                      />
                      <FieldError message={errors.certification} />
                    </div>

                    {/* Manuals */}
                    <div>
                      <label className={LABEL}>
                        Manuals <span className="text-red-500">*</span>
                      </label>
                      <SelectField
                        value={manuals}
                        onChange={(v) => {
                          markDirty();
                          setManuals(v);
                        }}
                        options={MANUALS_OPTIONS}
                        placeholder="Select Manual Requirement"
                        error={errors.manuals}
                      />
                      <FieldError message={errors.manuals} />
                    </div>

                    {/* Warranty & Guarantee */}
                    <div>
                      <label className={LABEL}>
                        Warranty & Guarantee{' '}
                        <span className="text-red-500">*</span>
                      </label>
                      <SelectField
                        value={warranty}
                        onChange={(v) => {
                          markDirty();
                          setWarranty(v);
                        }}
                        options={WARRANTY_OPTIONS}
                        placeholder="Select Warranty Terms"
                        error={errors.warrantyGuarantee}
                      />
                      <FieldError message={errors.warrantyGuarantee} />
                    </div>

                    {/* GA */}
                    <div>
                      <label className={LABEL}>
                        GA <span className="text-red-500">*</span>
                      </label>
                      <SelectField
                        value={ga}
                        onChange={(v) => {
                          markDirty();
                          setGa(v);
                        }}
                        options={GA_OPTIONS}
                        placeholder="Select GA Requirement"
                        error={errors.ga}
                      />
                      <FieldError message={errors.ga} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* end space-y-6 */}
        </form>
      </div>

      {/* ── Sticky Action Bar ─────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-[260px] right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_16px_0_rgba(0,0,0,0.06)]">
        <div className="max-w-[960px] mx-auto px-8 py-4 flex items-center justify-between gap-4">
          {/* Left — Reset */}
          <button
            type="button"
            onClick={handleReset}
            disabled={submitting || savingDraft}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-gray-200 text-[14px] font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>

          {/* Right — Cancel / Save Draft / Submit */}
          <div className="flex items-center gap-3">
            <Link
              href="/procurement"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-gray-200 text-[14px] font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </Link>

            <button
              type="button"
              onClick={() => handleDraftSave(false)}
              disabled={submitting || savingDraft}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gray-100 border border-gray-200 text-[14px] font-semibold text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {savingDraft ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {savingDraft ? 'Saving…' : 'Save Draft'}
            </button>

            <button
              type="submit"
              form="indent-form"
              onClick={handleSubmit}
              disabled={submitting || savingDraft}
              className="inline-flex items-center gap-2 h-11 px-7 rounded-xl bg-[#0F7B45] text-white text-[14px] font-semibold hover:bg-[#0A5C34] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {submitting ? 'Submitting…' : 'Submit Indent'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

// ─── Item Table Row Component ────────────────────────────────────────────────

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
];

function ItemTableRow({
  item,
  index,
  isOnly,
  onUpdate,
  onRemove,
  onDuplicate,
  skuMaster,
  itemOptions,
  itemsLoading,
  searchItems,
}: {
  item: ItemRow;
  index: number;
  isOnly: boolean;
  onUpdate: (id: string, field: keyof ItemRow, value: any) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  skuMaster: Array<{
    id: string;
    itemCode: string;
    description: string;
    uom: string;
    category?: string;
    subGroup?: string;
  }>;
  itemOptions: { value: string; label: string; sublabel: string }[];
  itemsLoading: boolean;
  searchItems: (q: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const cellInput =
    'w-full h-9 px-2.5 rounded-lg border text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all';

  const cell = (hasError?: boolean) =>
    `${cellInput} ${
      hasError
        ? 'border-red-300 bg-red-50/30 focus:ring-red-200 focus:border-red-400'
        : 'border-gray-200 bg-white focus:ring-[#0F7B45]/20 focus:border-[#0F7B45]'
    }`;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      onUpdate(item.id, 'errors', {
        ...item.errors,
        attachment: 'Invalid file type',
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onUpdate(item.id, 'errors', { ...item.errors, attachment: 'Max 10 MB' });
      return;
    }
    onUpdate(item.id, 'attachment', file);
  };

  return (
    <tr className="group border-b border-gray-100 hover:bg-gray-50/40 transition-colors align-top">
      {/* S.No. */}
      <td className="px-3 py-3">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-[11px] font-bold text-gray-500">
          {index + 1}
        </span>
      </td>

      {/* SKU Code */}
      <td className="px-3 py-3 relative">
        <EnterpriseSkuSelect
          value={item.skuCode}
          onChange={(v, opt) => {
            onUpdate(item.id, 'skuCode', v);
            if (opt) {
              onUpdate(item.id, 'itemName', opt.itemName || '');
              onUpdate(item.id, 'uom', opt.uom || opt.unit || '');
            }
          }}
          placeholder="Select SKU…"
          error={!!item.errors.skuCode}
        />
        {item.errors.skuCode && (
          <p className="text-[10px] text-red-600 mt-1 font-medium">
            {item.errors.skuCode}
          </p>
        )}
      </td>

      {/* Item Description */}
      <td className="px-3 py-3">
        <input
          type="text"
          value={item.itemName}
          onChange={(e) => onUpdate(item.id, 'itemName', e.target.value)}
          placeholder="Item description…"
          className={cell()}
        />
      </td>

      {/* BBU Code */}
      <td className="px-3 py-3">
        <input
          type="text"
          value={item.bbuCode}
          onChange={(e) => onUpdate(item.id, 'bbuCode', e.target.value)}
          placeholder="BBU code"
          className={cell()}
        />
      </td>

      {/* Qty */}
      <td className="px-3 py-3">
        <input
          type="number"
          value={item.qty}
          onChange={(e) => onUpdate(item.id, 'qty', e.target.value)}
          placeholder="0"
          min="0"
          step="any"
          className={cell(!!item.errors.qty)}
        />
        {item.errors.qty && (
          <p className="text-[10px] text-red-600 mt-1 font-medium">
            {item.errors.qty}
          </p>
        )}
      </td>

      {/* UOM */}
      <td className="px-3 py-3">
        <div className="relative">
          <select
            value={item.uom}
            onChange={(e) => onUpdate(item.id, 'uom', e.target.value)}
            className={`${cell(!!item.errors.uom)} appearance-none pr-7`}
          >
            <option value="">UOM…</option>
            {UOMS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
        </div>
        {item.errors.uom && (
          <p className="text-[10px] text-red-600 mt-1 font-medium">
            {item.errors.uom}
          </p>
        )}
      </td>

      {/* Technical Specification */}
      <td className="px-3 py-3">
        <textarea
          value={item.technicalSpec}
          onChange={(e) => onUpdate(item.id, 'technicalSpec', e.target.value)}
          placeholder="Technical spec…"
          rows={2}
          className={`${cellInput} ${
            item.errors.technicalSpec
              ? 'border-red-300 bg-red-50/30 focus:ring-red-200 focus:border-red-400'
              : 'border-gray-200 bg-white focus:ring-[#0F7B45]/20 focus:border-[#0F7B45]'
          } py-2 resize-none min-h-[36px]`}
        />
        {item.errors.technicalSpec && (
          <p className="text-[10px] text-red-600 mt-0.5 font-medium">
            {item.errors.technicalSpec}
          </p>
        )}
      </td>

      {/* Approved Makes */}
      <td className="px-3 py-3">
        <textarea
          value={item.approvedMakes}
          onChange={(e) => onUpdate(item.id, 'approvedMakes', e.target.value)}
          placeholder="e.g., L&T / Siemens / ABB"
          rows={2}
          className={`${cellInput} ${
            item.errors.approvedMakes
              ? 'border-red-300 bg-red-50/30 focus:ring-red-200 focus:border-red-400'
              : 'border-gray-200 bg-white focus:ring-[#0F7B45]/20 focus:border-[#0F7B45]'
          } py-2 resize-none min-h-[36px]`}
        />
        {item.errors.approvedMakes && (
          <p className="text-[10px] text-red-600 mt-0.5 font-medium">
            {item.errors.approvedMakes}
          </p>
        )}
      </td>

      {/* Attachment */}
      <td className="px-3 py-3">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          onChange={handleFile}
          className="hidden"
        />
        {item.attachment ? (
          <div className="flex flex-col gap-1">
            <span
              className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg truncate max-w-[90px]"
              title={item.attachment.name}
            >
              {item.attachment.name}
            </span>
            <button
              type="button"
              onClick={() => onUpdate(item.id, 'attachment', null)}
              className="text-[10px] text-red-500 hover:text-red-700 font-medium text-left"
            >
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-gray-300 text-[12px] font-medium text-gray-500 hover:border-[#0F7B45]/40 hover:text-[#0F7B45] hover:bg-[#0F7B45]/4 transition-colors"
          >
            <Paperclip className="w-3 h-3" />
            Upload
          </button>
        )}
        {item.errors.attachment && (
          <p className="text-[10px] text-red-600 mt-1 font-medium">
            {item.errors.attachment}
          </p>
        )}
      </td>

      {/* Action */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onDuplicate(item.id)}
            title="Duplicate row"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-[#0F7B45] hover:bg-[#0F7B45]/8 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            disabled={isOnly}
            title="Delete row"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
