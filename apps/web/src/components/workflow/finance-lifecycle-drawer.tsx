'use client';

import { X, ListCollapse, ChevronRight } from 'lucide-react';

import { StatusBadge } from '@/components/ui/status-badge';

interface FinanceLifecycleDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procurement: any | null;
  item: any | null;
}

export function FinanceLifecycleDrawer({
  open,
  onOpenChange,
  procurement,
  item,
}: FinanceLifecycleDrawerProps) {
  if (!procurement || !item) return null;

  if (!open) return null;

  const currentStageRecord = procurement.stageHistory?.find(
    (h: any) => h.stage === procurement.currentStage
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '400px',
        maxWidth: '100vw',
        background: 'var(--background)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--border)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
      }}
    >
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            Item Lifecycle
          </h2>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-muted)',
              margin: '4px 0 0',
            }}
          >
            {item.itemName}
          </p>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <X style={{ width: 20, height: 20, color: 'var(--text-muted)' }} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Status Overview Card */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--muted)',
                borderBottom: '1px solid var(--border)',
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              Status Overview
            </div>
            <div
              style={{
                padding: 16,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                fontSize: 13,
              }}
            >
              <div>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  Pending Stage
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium border bg-secondary/10">
                  {currentStageRecord?.stageName ||
                    `Stage ${procurement.currentStage}`}
                </span>
              </div>
              <div>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  Doer Name
                </span>
                <span>{currentStageRecord?.doerName || 'System'}</span>
              </div>
              <div>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  Last Updated
                </span>
                <span>
                  {procurement.updatedAt
                    ? new Date(procurement.updatedAt).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Core Info */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--muted)',
                borderBottom: '1px solid var(--border)',
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              Core Information
            </div>
            <div
              style={{
                padding: 16,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                fontSize: 13,
              }}
            >
              <div>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  Indent No.
                </span>
                <span style={{ fontWeight: 500 }}>
                  {procurement.referenceNo}
                </span>
              </div>
              <div>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  Priority
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium border bg-secondary/10">
                  {procurement.priority}
                </span>
              </div>
              <div>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  Item-wise Indent No.
                </span>
                <span>{item.itemCode || '-'}</span>
              </div>
              <div>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  Project / Department
                </span>
                <span>
                  {procurement.projectCode} / {procurement.department}
                </span>
              </div>
            </div>
          </div>

          {/* Item Details */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--muted)',
                borderBottom: '1px solid var(--border)',
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              Item Details
            </div>
            <div
              style={{
                padding: 16,
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: 16,
                fontSize: 13,
              }}
            >
              <div style={{ gridColumn: '1 / -1' }}>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  Description
                </span>
                <span>{item.itemName}</span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                }}
              >
                <div>
                  <span
                    style={{
                      display: 'block',
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      marginBottom: 4,
                    }}
                  >
                    Requested Qty
                  </span>
                  <span>
                    {item.requestedQuantity} {item.uom}
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      display: 'block',
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      marginBottom: 4,
                    }}
                  >
                    Approved Qty
                  </span>
                  <span>
                    {item.approvedQuantity || '-'} {item.uom}
                  </span>
                </div>
                <div>
                  <span
                    style={{
                      display: 'block',
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      marginBottom: 4,
                    }}
                  >
                    Target Price
                  </span>
                  <span>{item.targetPrice ? `₹${item.targetPrice}` : '-'}</span>
                </div>
                <div>
                  <span
                    style={{
                      display: 'block',
                      color: 'var(--text-muted)',
                      fontSize: 11,
                      marginBottom: 4,
                    }}
                  >
                    Make
                  </span>
                  <span>{item.make || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reference Numbers */}
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--muted)',
                borderBottom: '1px solid var(--border)',
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              Reference Numbers
            </div>
            <div
              style={{
                padding: 16,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                fontSize: 13,
              }}
            >
              <div>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  RFQ Number
                </span>
                <span>{item.rfqNumber || '-'}</span>
              </div>
              <div>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  PO Number
                </span>
                <span>{item.poNumber || '-'}</span>
              </div>
              <div>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  GRN Number
                </span>
                <span>{item.grnNumber || '-'}</span>
              </div>
              <div>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  Bill Number
                </span>
                <span>{item.billNumber || '-'}</span>
              </div>
              <div>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  PO Status
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium border bg-secondary/10">
                  {item.poStatus || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="ifh-btn-secondary"
        >
          Close
        </button>
      </div>
    </div>
  );
}
