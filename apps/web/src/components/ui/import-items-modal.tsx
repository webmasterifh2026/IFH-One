'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { apiFetch, buildApiUrl } from '@/lib/api/fetch';

interface ImportItemsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportItemsModal({
  onClose,
  onSuccess,
}: ImportItemsModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<
    'SKIP' | 'UPDATE' | 'IMPORT_NEW_ONLY'
  >('SKIP');
  const [importSummary, setImportSummary] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const downloadTemplate = async () => {
    try {
      const url = buildApiUrl('/skus/export/template');
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('ifh_token')}`,
        },
      });
      if (!res.ok) throw new Error('Failed to download template');

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'IFH_One_Items_Import_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const validateFile = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const url = buildApiUrl('/skus/import/validate');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('ifh_token')}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Validation failed');
      }

      const result = await res.json();
      setValidationResult(result);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeImport = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        fileName: file?.name || 'unknown',
        validRecords: validationResult.validRecords,
        duplicateStrategy,
      };

      const res = await apiFetch('/skus/import/execute', {
        method: 'POST',
        body: JSON.stringify(payload),
        timeoutMs: 300000, // 5 minutes timeout for massive imports
      });

      if (res.error) throw new Error(res.error);

      setImportSummary(res);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div
        className="ifh-card"
        style={{
          width: '100%',
          maxWidth: 700,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
            Bulk Import Items
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                padding: 12,
                background: '#fee2e2',
                color: '#dc2626',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {step === 1 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 20,
                }}
              >
                <div>
                  <h3
                    style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}
                  >
                    1. Upload Data File
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--text-muted)',
                      margin: 0,
                    }}
                  >
                    Support .xlsx or .csv files up to 10MB.
                  </p>
                </div>
                <button onClick={downloadTemplate} className="ifh-btn-ghost">
                  <Download size={14} /> Download Template
                </button>
              </div>

              <div
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 8,
                  padding: 40,
                  textAlign: 'center',
                  background: 'var(--surface2)',
                  cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload
                  size={32}
                  color="var(--primary)"
                  style={{ margin: '0 auto 12px' }}
                />
                <p
                  style={{ fontSize: 14, fontWeight: 500, margin: '0 0 8px 0' }}
                >
                  Click or drag file to this area to upload
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    margin: 0,
                  }}
                >
                  {file ? file.name : 'No file selected'}
                </p>
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>

              <div
                style={{
                  marginTop: 24,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 12,
                }}
              >
                <button className="ifh-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="ifh-btn-primary"
                  onClick={validateFile}
                  disabled={!file || loading}
                >
                  {loading ? 'Validating...' : 'Next Step'}
                </button>
              </div>
            </div>
          )}

          {step === 2 && validationResult && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
                2. Preview & Validate
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    padding: 12,
                    background: 'var(--surface2)',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Total Records
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>
                    {validationResult.totalRecords}
                  </div>
                </div>
                <div
                  style={{
                    padding: 12,
                    background: '#dcfce7',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#166534' }}>
                    New Valid
                  </div>
                  <div
                    style={{ fontSize: 20, fontWeight: 600, color: '#166534' }}
                  >
                    {validationResult.newRecords?.length || 0}
                  </div>
                </div>
                <div
                  style={{
                    padding: 12,
                    background: '#fef9c3',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#854d0e' }}>
                    Duplicates (Valid)
                  </div>
                  <div
                    style={{ fontSize: 20, fontWeight: 600, color: '#854d0e' }}
                  >
                    {validationResult.duplicateRecords?.length || 0}
                  </div>
                </div>
                <div
                  style={{
                    padding: 12,
                    background: '#fee2e2',
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontSize: 12, color: '#991b1b' }}>Invalid</div>
                  <div
                    style={{ fontSize: 20, fontWeight: 600, color: '#991b1b' }}
                  >
                    {validationResult.invalidRecords?.length || 0}
                  </div>
                </div>
              </div>

              {validationResult.duplicateRecords?.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <label className="ifh-label">
                    Duplicate Handling Strategy
                  </label>
                  <select
                    className="ifh-input"
                    value={duplicateStrategy}
                    onChange={(e: any) => setDuplicateStrategy(e.target.value)}
                  >
                    <option value="SKIP">
                      Skip existing items (Keep current data)
                    </option>
                    <option value="UPDATE">
                      Update existing items with new data
                    </option>
                    <option value="IMPORT_NEW_ONLY">
                      Only import completely new items
                    </option>
                  </select>
                </div>
              )}

              {validationResult.invalidRecords?.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h4
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#dc2626',
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <AlertTriangle size={14} /> Validation Errors (
                    {validationResult.invalidRecords.length})
                  </h4>
                  <div
                    style={{
                      maxHeight: 150,
                      overflowY: 'auto',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 6,
                    }}
                  >
                    <table
                      className="ifh-table"
                      style={{
                        fontSize: 12,
                        width: '100%',
                        textAlign: 'left',
                        borderCollapse: 'collapse',
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid #fecaca',
                            }}
                          >
                            Row
                          </th>
                          <th
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid #fecaca',
                            }}
                          >
                            SKU
                          </th>
                          <th
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid #fecaca',
                            }}
                          >
                            Error
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.invalidRecords
                          .slice(0, 10)
                          .map((r: any, i: number) => (
                            <tr key={i}>
                              <td
                                style={{
                                  padding: '8px 12px',
                                  borderBottom: '1px solid #fecaca',
                                }}
                              >
                                {r.rowNum}
                              </td>
                              <td
                                style={{
                                  padding: '8px 12px',
                                  borderBottom: '1px solid #fecaca',
                                }}
                              >
                                {r.sku || 'N/A'}
                              </td>
                              <td
                                style={{
                                  padding: '8px 12px',
                                  borderBottom: '1px solid #fecaca',
                                  color: '#dc2626',
                                }}
                              >
                                {r.errors?.join(', ')}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {validationResult.invalidRecords.length > 10 && (
                      <div
                        style={{
                          padding: '8px 12px',
                          fontSize: 11,
                          color: '#dc2626',
                          textAlign: 'center',
                        }}
                      >
                        Showing 10 of {validationResult.invalidRecords.length}{' '}
                        errors
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div
                style={{
                  marginTop: 24,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <button
                  className="ifh-btn-secondary"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  className="ifh-btn-primary"
                  onClick={executeImport}
                  disabled={
                    loading || validationResult.validRecords.length === 0
                  }
                >
                  {loading ? 'Importing...' : 'Execute Import'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && importSummary && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <CheckCircle
                size={48}
                color="#16a34a"
                style={{ margin: '0 auto 16px' }}
              />
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                Import Completed Successfully
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
                Your items have been imported into the database.
              </p>

              <div
                style={{
                  display: 'inline-grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 24,
                  textAlign: 'left',
                  background: 'var(--surface2)',
                  padding: '20px 40px',
                  borderRadius: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Imported
                  </div>
                  <div
                    style={{ fontSize: 24, fontWeight: 600, color: '#166534' }}
                  >
                    {importSummary.imported}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Updated
                  </div>
                  <div
                    style={{ fontSize: 24, fontWeight: 600, color: '#0369a1' }}
                  >
                    {importSummary.updated}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Skipped
                  </div>
                  <div
                    style={{ fontSize: 24, fontWeight: 600, color: '#854d0e' }}
                  >
                    {importSummary.skipped}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 32 }}>
                <button
                  className="ifh-btn-primary"
                  onClick={() => {
                    onClose();
                    onSuccess();
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
