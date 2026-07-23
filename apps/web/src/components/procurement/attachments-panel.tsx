'use client';

import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  ImageIcon,
  File,
  Trash2,
  Download,
  Eye,
} from 'lucide-react';
import type { ProcurementAttachment } from '@/lib/api/procurement';
import { formatDate } from '@/lib/procurement-stages';

const ALLOWED_TYPES: Record<
  string,
  { icon: React.ElementType; color: string; label: string }
> = {
  'application/pdf': { icon: FileText, color: '#DC2626', label: 'PDF' },
  'application/vnd.ms-excel': {
    icon: FileText,
    color: '#059669',
    label: 'XLS',
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    icon: FileText,
    color: '#059669',
    label: 'XLSX',
  },
  'application/msword': { icon: FileText, color: '#2563EB', label: 'DOC' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    icon: FileText,
    color: '#2563EB',
    label: 'DOCX',
  },
  'image/jpeg': { icon: ImageIcon, color: '#7C3AED', label: 'JPG' },
  'image/png': { icon: ImageIcon, color: '#7C3AED', label: 'PNG' },
  'image/webp': { icon: ImageIcon, color: '#7C3AED', label: 'WEBP' },
};

function formatBytes(b?: number): string {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

interface AttachmentsPanelProps {
  attachments: ProcurementAttachment[];
  procurementId: string;
  stageNumber: number;
  onAttachmentsChange?: (attachments: ProcurementAttachment[]) => void;
}

export function AttachmentsPanel({
  attachments,
  procurementId,
  stageNumber,
  onAttachmentsChange,
}: AttachmentsPanelProps) {
  const [localAttachments, setLocalAttachments] =
    useState<ProcurementAttachment[]>(attachments);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newAttachments: ProcurementAttachment[] = [];

    Array.from(files).forEach((file) => {
      if (
        !ALLOWED_TYPES[file.type] &&
        !file.name.match(/\.(pdf|xls|xlsx|doc|docx|jpg|jpeg|png|webp)$/i)
      ) {
        alert(`File type not supported: ${file.name}`);
        return;
      }
      const url = URL.createObjectURL(file);
      newAttachments.push({
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        stageNumber,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        fileUrl: url,
        uploadedBy: { id: 'U001', fullName: 'Current User' },
        createdAt: new Date().toISOString(),
      });
    });

    setTimeout(() => {
      const updated = [...localAttachments, ...newAttachments];
      setLocalAttachments(updated);
      onAttachmentsChange?.(updated);
      setUploading(false);
    }, 600);
  }

  function deleteAttachment(id: string) {
    const updated = localAttachments.filter((a) => a.id !== id);
    setLocalAttachments(updated);
    onAttachmentsChange?.(updated);
  }

  function previewAttachment(att: ProcurementAttachment) {
    if (att.fileType.startsWith('image/')) {
      setPreviewUrl(att.fileUrl);
      setPreviewName(att.fileName);
    } else {
      window.open(att.fileUrl, '_blank');
    }
  }

  function downloadAttachment(att: ProcurementAttachment) {
    const a = document.createElement('a');
    a.href = att.fileUrl;
    a.download = att.fileName;
    a.click();
  }

  const dropZoneStyle: React.CSSProperties = {
    border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
    borderRadius: 12,
    padding: '28px 20px',
    textAlign: 'center',
    background: dragOver ? 'rgba(15,123,69,0.04)' : 'var(--surface2)',
    transition: 'all 150ms',
    cursor: 'pointer',
  };

  return (
    <div>
      {/* Drop Zone */}
      <div
        style={dropZoneStyle}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          accept=".pdf,.xls,.xlsx,.doc,.docx,.jpg,.jpeg,.png,.webp"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Upload
          style={{
            width: 28,
            height: 28,
            color: dragOver ? 'var(--primary)' : 'var(--text-faint)',
            margin: '0 auto 10px',
          }}
        />
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: dragOver ? 'var(--primary)' : 'var(--text-primary)',
            marginBottom: 4,
          }}
        >
          {uploading ? 'Uploading…' : 'Drop files here or click to upload'}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          PDF, Excel, Word, Images (max 10MB each)
        </p>
      </div>

      {/* Attachment List */}
      {localAttachments.length > 0 && (
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <h4
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            {localAttachments.length} Attachment
            {localAttachments.length !== 1 ? 's' : ''}
          </h4>
          {localAttachments.map((att) => {
            const typeInfo = ALLOWED_TYPES[att.fileType] || {
              icon: File,
              color: '#6B7280',
              label: att.fileName.split('.').pop()?.toUpperCase() || 'FILE',
            };
            const Icon = typeInfo.icon;
            return (
              <div
                key={att.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  transition: 'border-color 120ms',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = 'var(--primary)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = 'var(--border)')
                }
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: typeInfo.color + '18',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon
                    style={{ width: 15, height: 15, color: typeInfo.color }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {att.fileName}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--text-muted)',
                      marginTop: 1,
                    }}
                  >
                    {typeInfo.label}
                    {att.fileSize ? ` · ${formatBytes(att.fileSize)}` : ''}
                    {att.stageNumber !== undefined
                      ? ` · Stage ${att.stageNumber}`
                      : ''}
                    {' · '}
                    {att.uploadedBy.fullName} · {formatDate(att.createdAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => previewAttachment(att)}
                    title="Preview"
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      transition: 'all 120ms',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        'var(--surface2)';
                      (e.currentTarget as HTMLElement).style.color =
                        'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        'none';
                      (e.currentTarget as HTMLElement).style.color =
                        'var(--text-muted)';
                    }}
                  >
                    <Eye style={{ width: 14, height: 14 }} />
                  </button>
                  <button
                    onClick={() => downloadAttachment(att)}
                    title="Download"
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      transition: 'all 120ms',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        'var(--surface2)';
                      (e.currentTarget as HTMLElement).style.color =
                        'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        'none';
                      (e.currentTarget as HTMLElement).style.color =
                        'var(--text-muted)';
                    }}
                  >
                    <Download style={{ width: 14, height: 14 }} />
                  </button>
                  <button
                    onClick={() => deleteAttachment(att.id)}
                    title="Delete"
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      transition: 'all 120ms',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        '#FEF2F2';
                      (e.currentTarget as HTMLElement).style.color = '#DC2626';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        'none';
                      (e.currentTarget as HTMLElement).style.color =
                        'var(--text-muted)';
                    }}
                  >
                    <Trash2 style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setPreviewUrl(null)}
        >
          <div
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'var(--card)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {previewName}
              </span>
              <button
                onClick={() => setPreviewUrl(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 18,
                  color: 'var(--text-muted)',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <img
              src={previewUrl}
              alt={previewName}
              style={{
                display: 'block',
                maxWidth: '80vw',
                maxHeight: '75vh',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
