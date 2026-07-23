'use client';

import type { StageField } from '@/lib/workflow/stage-config-types';

interface DecisionSummaryProps {
  fields: StageField[];
  fieldValues: Record<string, any>;
  status: string;
}

function formatFieldValue(field: StageField, value: any): string {
  if (value === undefined || value === null || value === '') return '—';
  if (field.type === 'checkbox') return value ? 'Yes' : 'No';
  if (field.type === 'select') {
    const opt = field.options?.find((o) => o.value === value);
    return opt?.label ?? String(value);
  }
  if (field.currency) return `₹ ${Number(value).toLocaleString('en-IN')}`;
  return String(value);
}

/**
 * Read-only stage summary — replaces the editable decision footer (v2.8.4).
 * Displays the last recorded field values and remarks for this stage; all
 * updates now happen exclusively through the Bulk Update feature on the
 * stage queue page, never from this detail view.
 */
export function DecisionPanel({
  fields,
  fieldValues,
  status,
}: DecisionSummaryProps) {
  const nonRemarksFields = fields.filter((f) => f.key !== 'remarks');
  const remarksField = fields.find((f) => f.key === 'remarks');

  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
            Status
          </p>
          <p className="text-[13px] font-semibold text-gray-800">{status}</p>
        </div>
        {nonRemarksFields.map((field) => (
          <div key={field.key}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
              {field.label}
            </p>
            <p className="text-[13px] font-semibold text-gray-800">
              {formatFieldValue(field, fieldValues[field.key])}
            </p>
          </div>
        ))}
      </div>

      {remarksField && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            {remarksField.label}
          </p>
          <p className="text-[13px] text-gray-700 max-w-3xl">
            {formatFieldValue(remarksField, fieldValues.remarks)}
          </p>
        </div>
      )}

      <p className="text-[11px] text-gray-400 mt-3">
        To update this record, use Bulk Update from the stage queue page.
      </p>
    </div>
  );
}
