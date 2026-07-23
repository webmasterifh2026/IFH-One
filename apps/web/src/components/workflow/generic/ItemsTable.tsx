'use client';

import { Package } from 'lucide-react';
import type { StageField } from '@/lib/workflow/stage-config-types';
import type { ProcurementItem } from '@/lib/api/procurement';

interface ItemsTableProps {
  items: ProcurementItem[];
  itemFields: StageField[];
  itemFieldValues: Record<string, Record<string, any>>;
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

export function ItemsTable({
  items,
  itemFields,
  itemFieldValues,
}: ItemsTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50/50">
        <Package className="w-8 h-8 text-gray-300 mb-3" />
        <p className="text-[13px] font-medium text-gray-500">
          No items found in this indent
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-max text-left border-collapse whitespace-nowrap min-w-full">
          <thead className="bg-gray-100 sticky top-0 z-10 border-b border-gray-300">
            <tr>
              <th className="px-4 py-2 text-[11px] font-bold text-gray-600 uppercase tracking-wider border-r border-gray-300">
                Item Code
              </th>
              <th className="px-4 py-2 text-[11px] font-bold text-gray-600 uppercase tracking-wider border-r border-gray-300 min-w-[200px]">
                Description
              </th>
              <th className="px-4 py-2 text-[11px] font-bold text-gray-600 uppercase tracking-wider border-r border-gray-300">
                Category
              </th>
              <th className="px-4 py-2 text-[11px] font-bold text-gray-600 uppercase tracking-wider border-r border-gray-300">
                Sub Group
              </th>
              <th className="px-4 py-2 text-[11px] font-bold text-gray-600 uppercase tracking-wider border-r border-gray-300 text-right">
                Qty
              </th>
              <th className="px-4 py-2 text-[11px] font-bold text-gray-600 uppercase tracking-wider border-r border-gray-300">
                UOM
              </th>
              {itemFields.map((field) => (
                <th
                  key={field.key}
                  className="px-4 py-2 text-[11px] font-bold text-indigo-700 uppercase tracking-wider border-r border-gray-300 bg-indigo-50/50 min-w-[140px]"
                >
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => {
              const values = itemFieldValues[item.id] || {};
              return (
                <tr
                  key={item.id}
                  className="hover:bg-blue-50/30 transition-colors"
                >
                  <td className="px-4 py-2 border-r border-gray-200 align-middle">
                    <span className="text-[12px] font-mono font-bold text-gray-800">
                      {item.itemCode || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-r border-gray-200 align-middle min-w-[200px] whitespace-normal">
                    <p className="text-[13px] font-semibold text-gray-900 leading-tight">
                      {item.itemName}
                    </p>
                    {item.description && (
                      <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2 border-r border-gray-200 align-middle">
                    <span className="text-[12px] text-gray-600">
                      {item.category || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-r border-gray-200 align-middle">
                    <span className="text-[12px] text-gray-600">
                      {item.subGroup || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-r border-gray-200 align-middle text-right">
                    <span className="text-[13px] font-bold text-gray-900">
                      {Number(item.quantity).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-r border-gray-200 align-middle">
                    <span className="text-[12px] font-semibold text-gray-500 uppercase">
                      {item.unit || 'EA'}
                    </span>
                  </td>
                  {itemFields.map((field) => (
                    <td
                      key={field.key}
                      className="px-3 py-2 border-r border-gray-200 align-middle min-w-[140px] bg-indigo-50/10"
                    >
                      <span className="text-[12px] text-gray-700">
                        {formatFieldValue(field, values[field.key])}
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
