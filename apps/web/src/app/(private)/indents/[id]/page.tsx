'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Calendar,
  User,
  FileText,
  Package,
} from 'lucide-react';
import { getProcurement } from '@/lib/api/procurement';
import { formatDate } from '@/lib/procurement-stages';

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="ifh-card" style={{ marginBottom: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface2)',
        }}
      >
        <Icon style={{ width: 18, height: 18, color: 'var(--primary)' }} />
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
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </label>
      <div
        style={{
          fontSize: 13,
          color: 'var(--text-primary)',
          fontWeight: 500,
          minHeight: 20,
        }}
      >
        {value || '—'}
      </div>
    </div>
  );
}

export default function DraftIndentViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProcurement(id)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div
        className="page-content flex items-center justify-center"
        style={{ minHeight: '80vh', color: 'var(--text-muted)' }}
      >
        <Loader2
          className="animate-spin"
          style={{ width: 32, height: 32, marginRight: 12 }}
        />{' '}
        Loading draft...
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="page-content flex items-center justify-center"
        style={{ minHeight: '80vh', color: '#DC2626' }}
      >
        Failed to load draft or draft not found.
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingBottom: 60 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            marginBottom: 24,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <button
              onClick={() => router.push('/indents')}
              className="flex items-center gap-2 transition-colors"
              style={{
                color: 'var(--primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginBottom: 12,
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <ArrowLeft style={{ width: 15, height: 15 }} /> Back to Drafts
            </button>
            <h1
              className="font-display"
              style={{
                fontSize: 24,
                fontWeight: 400,
                color: 'var(--text-primary)',
              }}
            >
              Draft Indent: {data.referenceNo}
            </h1>
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 8,
                fontSize: 12,
                color: 'var(--text-muted)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar style={{ width: 14, height: 14 }} /> Created{' '}
                {formatDate(data.createdAt)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <User style={{ width: 14, height: 14 }} /> By{' '}
                {data.requestedBy?.fullName || '—'}
              </span>
            </div>
          </div>
          <div>
            <span
              style={{
                display: 'inline-block',
                padding: '6px 12px',
                borderRadius: 16,
                background: 'rgba(107, 114, 128, 0.1)',
                color: '#4B5563',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              DRAFT
            </span>
          </div>
        </div>

        {/* General Info */}
        <SectionCard title="General Information" icon={FileText}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Field label="Reference No" value={data.referenceNo} />
            <Field label="Title" value={data.title} />
            <Field label="Description" value={data.description} />
            <Field label="Priority" value={data.priority} />
            <Field label="Application" value={data.application} />
            <Field label="Item Type" value={data.itemType} />
            <Field
              label="Department"
              value={data.requestedBy?.department?.name || data.departmentId}
            />
            <Field
              label="Required Date"
              value={
                data.requiredDate ? formatDate(data.requiredDate) : undefined
              }
            />
          </div>
        </SectionCard>

        {/* Project Info */}
        <SectionCard title="Project Information" icon={FileText}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Field label="Project ID" value={data.projectId} />
            <Field label="Project Name" value={data.projectName} />
          </div>
        </SectionCard>

        {/* Procurement Requirements */}
        <SectionCard title="Procurement Requirements" icon={FileText}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Field label="Painting Spec" value={data.paintingSpecRemark} />
            <Field
              label="Packing Requirement"
              value={data.packingRequirement}
            />
            <Field
              label="Warranty / Guarantee"
              value={data.warrantyGuarantee}
            />
          </div>
        </SectionCard>

        {/* Documents */}
        <SectionCard title="Document Requirements" icon={FileText}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Field label="Certification" value={data.certification} />
            <Field label="Manuals" value={data.manuals} />
            <Field label="GA Drawing" value={data.ga} />
          </div>
        </SectionCard>

        {/* Items */}
        <SectionCard title="Items" icon={Package}>
          <div style={{ overflowX: 'auto' }}>
            <table className="ifh-table" style={{ minWidth: 800 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  <th
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      width: 100,
                    }}
                  >
                    SKU Code
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'left' }}>
                    Item Name / Desc
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      textAlign: 'right',
                      width: 80,
                    }}
                  >
                    Qty
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      width: 80,
                    }}
                  >
                    UOM
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      width: 160,
                    }}
                  >
                    Technical Spec
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      width: 140,
                    }}
                  >
                    Approved Makes
                  </th>
                  <th
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      width: 140,
                    }}
                  >
                    Attachment
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items?.length > 0 ? (
                  data.items.map((it: any) => (
                    <tr
                      key={it.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                        {it.itemCode}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{it.itemName}</td>
                      <td
                        style={{
                          padding: '10px 12px',
                          textAlign: 'right',
                          fontWeight: 600,
                        }}
                      >
                        {it.quantity}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{it.unit}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {it.technicalSpec || '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {it.approvedMakes || '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {it.attachmentName ? (
                          <a
                            href={it.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'var(--primary)' }}
                          >
                            {it.attachmentName}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      No items attached to this draft
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Draft History */}
        <SectionCard title="Draft History" icon={Calendar}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--surface2)',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  Draft Created
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    marginTop: 4,
                  }}
                >
                  By {data.requestedBy?.fullName || '—'}
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {formatDate(data.createdAt)}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'var(--surface2)',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  Last Updated
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    marginTop: 4,
                  }}
                >
                  Auto Saved
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {formatDate(data.updatedAt)}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
