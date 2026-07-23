'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  performBulkMultiStageAction,
  type ProcurementListItem,
  type ProcurementItem,
} from '@/lib/api/procurement';
import { getStageConfig } from '@/components/workflow/stage-config';

interface FlattenedItem extends ProcurementItem {
  procurement: ProcurementListItem;
}

interface BulkMultiStageUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: FlattenedItem[];
  stageNumber: number;
  onComplete?: () => void;
}

interface RowData {
  itemId: string;
  indentNo: string;
  itemwiseIndentNo: string;
  itemDescription: string;
  liveStock: string;
  poNumber: string;
  statusOrPONumber: string;
  remarks: string;
}

export function BulkMultiStageUpdateModal({
  isOpen,
  onClose,
  selectedItems,
  stageNumber,
  onComplete,
}: BulkMultiStageUpdateModalProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const config = getStageConfig(stageNumber);

  const [rowData, setRowData] = useState<Record<string, RowData>>({});

  useEffect(() => {
    if (!isOpen) {
      setRowData({});
      setResult(null);
      setError('');
      setIsCollapsed(false);
    } else {
      // Initialize row data
      const initial: Record<string, RowData> = {};
      selectedItems.forEach((item) => {
        const itemIdx = item.procurement.items
          ? item.procurement.items.findIndex((i: any) => i.id === item.id)
          : -1;
        initial[item.id] = {
          itemId: item.id,
          indentNo: item.procurement.referenceNo,
          itemwiseIndentNo: `${item.procurement.referenceNo}-${String(itemIdx >= 0 ? itemIdx + 1 : 1).padStart(3, '0')}`,
          itemDescription: item.itemName,
          liveStock: '—', // Could be fetched from metadata
          poNumber: (item.procurement as any).poNumber || '—',
          statusOrPONumber: '',
          remarks: '',
        };
      });
      setRowData(initial);
    }
  }, [isOpen, selectedItems]);

  const handleFieldChange = (
    itemId: string,
    field: keyof RowData,
    value: string
  ) => {
    setRowData((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    // Validation
    for (const row of Object.values(rowData)) {
      if (stageNumber === 6) {
        // PO Creation: PO Number is mandatory
        if (!row.statusOrPONumber?.trim()) {
          setError('PO Number is required for all selected items.');
          return;
        }
      } else {
        // Stages 3, 4, 5: Status is mandatory
        if (!row.statusOrPONumber) {
          setError('Status is required for all selected items.');
          return;
        }
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const updates = Object.values(rowData).map((row) => {
        const metadata: any = {};

        if (stageNumber === 6) {
          metadata.poNumber = row.statusOrPONumber;
        } else {
          metadata.status = row.statusOrPONumber;
        }

        return {
          procurementId: row.itemId,
          action: 'APPROVE',
          remarks: row.remarks || undefined,
          metadata,
        };
      });

      const res = await performBulkMultiStageAction(updates, {
        notifyUsers: true,
      });
      setResult(res);
      onComplete?.();
    } catch (err: any) {
      setError(err?.message || 'Bulk update failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getColumnLabel = () => {
    switch (stageNumber) {
      case 3:
        return 'Status Float RFQ';
      case 4:
        return 'Status';
      case 5:
        return 'Status';
      case 6:
        return 'PO Number';
      default:
        return 'Status';
    }
  };

  const getOptions = () => {
    if (!config) return [];
    const field = config.fields[0];
    return field?.options || [];
  };

  if (!isOpen) return null;

  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-[18px] font-bold text-gray-900">
              Update Complete
            </h2>
          </div>

          <div className="p-6">
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <p className="text-[16px] font-bold text-gray-900">
                Bulk Update Complete
              </p>
              <p className="text-[13px] text-gray-500">
                {result.totalUpdated} of {result.totalSelected} items updated
                successfully
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                <p className="text-[20px] font-bold text-emerald-700">
                  {result.totalUpdated}
                </p>
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide mt-1">
                  Updated
                </p>
              </div>
              <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-100 text-center">
                <p className="text-[20px] font-bold text-yellow-700">
                  {result.totalSkipped || 0}
                </p>
                <p className="text-[11px] font-semibold text-yellow-600 uppercase tracking-wide mt-1">
                  Skipped
                </p>
              </div>
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-center">
                <p className="text-[20px] font-bold text-red-700">
                  {result.totalFailed || 0}
                </p>
                <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wide mt-1">
                  Failed
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="h-10 px-5 rounded-xl bg-[#0F7B45] text-white text-[13px] font-semibold hover:bg-[#0A5C34] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] max-h-[90vh] flex flex-col">
        {/* Header with gradient */}
        <div className="relative px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-[#0F7B45] to-[#0A5C34]">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-[18px] font-bold text-white">Bulk Update</h2>
              <p className="text-[13px] text-white/80 mt-1">
                {selectedItems.length}{' '}
                {selectedItems.length === 1 ? 'item' : 'items'} selected
              </p>
            </div>
            {!submitting && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Stage Card */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-between text-left"
          >
            <div>
              <h3 className="text-[14px] font-bold text-gray-900">
                Stage {stageNumber} — {config?.title || 'Update'}
              </h3>
              <p className="text-[12px] text-gray-500 mt-0.5">
                {isCollapsed
                  ? 'Click to expand'
                  : 'Update fields for all selected items'}
              </p>
            </div>
            {isCollapsed ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>

        {/* Table Content */}
        {!isCollapsed && (
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 sticky top-0 z-10">
                    <th className="text-left py-3 px-3 font-bold text-[11px] text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">
                      Indent No.
                    </th>
                    <th className="text-left py-3 px-3 font-bold text-[11px] text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">
                      Itemwise Indent No.
                    </th>
                    <th className="text-left py-3 px-3 font-bold text-[11px] text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">
                      Item Description
                    </th>
                    <th className="text-left py-3 px-3 font-bold text-[11px] text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">
                      Live Stock
                    </th>
                    <th className="text-left py-3 px-3 font-bold text-[11px] text-gray-500 uppercase tracking-wider border-b-2 border-gray-200">
                      PO Number
                    </th>
                    <th className="text-left py-3 px-3 font-bold text-[11px] text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 min-w-[180px]">
                      {getColumnLabel()} <span className="text-red-500">*</span>
                    </th>
                    <th className="text-left py-3 px-3 font-bold text-[11px] text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 min-w-[200px]">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(rowData).map((row, idx) => (
                    <tr
                      key={row.itemId}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                    >
                      <td className="py-2.5 px-3 text-gray-700 border-b border-gray-100">
                        {row.indentNo}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 border-b border-gray-100 font-mono text-[12px]">
                        {row.itemwiseIndentNo}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 border-b border-gray-100">
                        {row.itemDescription}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 border-b border-gray-100">
                        {row.liveStock}
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 border-b border-gray-100">
                        {row.poNumber}
                      </td>
                      <td className="py-2.5 px-3 border-b border-gray-100">
                        {stageNumber === 6 ? (
                          <input
                            type="text"
                            value={row.statusOrPONumber}
                            onChange={(e) =>
                              handleFieldChange(
                                row.itemId,
                                'statusOrPONumber',
                                e.target.value
                              )
                            }
                            placeholder="Enter PO Number"
                            className="w-full h-9 px-3 text-[13px] bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#0F7B45] focus:ring-2 focus:ring-[#0F7B45]/20"
                          />
                        ) : (
                          <select
                            value={row.statusOrPONumber}
                            onChange={(e) =>
                              handleFieldChange(
                                row.itemId,
                                'statusOrPONumber',
                                e.target.value
                              )
                            }
                            className="w-full h-9 px-3 text-[13px] bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#0F7B45] focus:ring-2 focus:ring-[#0F7B45]/20"
                          >
                            <option value="">Select...</option>
                            {getOptions().map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-2.5 px-3 border-b border-gray-100">
                        <textarea
                          value={row.remarks}
                          onChange={(e) =>
                            handleFieldChange(
                              row.itemId,
                              'remarks',
                              e.target.value
                            )
                          }
                          placeholder="Add remarks..."
                          rows={2}
                          className="w-full px-3 py-2 text-[13px] bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-[#0F7B45] focus:ring-2 focus:ring-[#0F7B45]/20 resize-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mx-6 mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-[13px] text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Fixed Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between">
          <p className="text-[12px] text-gray-500">
            All mandatory fields must be filled
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="h-10 px-5 rounded-xl text-[13px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#0F7B45] text-white text-[13px] font-semibold hover:bg-[#0A5C34] transition-colors disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting
                ? 'Updating...'
                : `Update ${selectedItems.length} ${selectedItems.length === 1 ? 'Item' : 'Items'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
