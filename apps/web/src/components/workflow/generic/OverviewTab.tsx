'use client';

import { Package } from 'lucide-react';
import type { Procurement } from '@/lib/api/procurement';

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[13px] font-semibold text-gray-900">{value ?? '—'}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-3 mb-5">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">{children}</div>
    </div>
  );
}

/**
 * "Indent Details" tab (v2.8.4) — merges the former Overview + Items tabs
 * into one read-only page: Indent / Project / Commercial / Technical
 * information sections, followed by the item-level table.
 */
export function OverviewTab({ procurement }: { procurement: Procurement }) {
  const p = procurement as any;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-5">
      <Section title="Indent Information">
        <Field label="Indent Number" value={p.referenceNo} />
        <Field label="Current Stage" value={p.currentStageName || `Stage ${p.currentStage}`} />
        <Field label="Status" value={p.status} />
        <Field label="Priority" value={p.priority} />
        <Field label="Created By" value={p.requestedBy?.fullName} />
        <Field label="Created Date" value={p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : undefined} />
      </Section>

      <Section title="Project Information">
        <Field label="Project Name" value={p.projectName} />
        <Field label="Project ID" value={p.projectId} />
        <Field label="Department" value={p.departmentId} />
        <Field label="Application / End Use" value={p.application} />
        <Field label="Required Date" value={p.requiredDate ? new Date(p.requiredDate).toLocaleDateString('en-IN') : undefined} />
        <Field label="Preferred Vendor" value={p.vendorName} />
      </Section>

      <Section title="Commercial Information">
        <Field label="Vendor" value={p.vendorName} />
        <Field label="Payment Terms" value={p.paymentTerms} />
        <Field label="Delivery Terms" value={p.deliveryTerms} />
        <Field label="Delivery Location" value={p.deliveryLocation} />
      </Section>

      <Section title="Technical Information">
        <Field label="Certification Required" value={p.certification || 'None specified'} />
        <Field label="Packing Specification" value={p.packingRequirement || 'Standard'} />
        <Field label="Painting Specification" value={p.paintingSpec || 'Standard'} />
        <Field label="Inspection Requirement" value={p.inspectionRequirement} />
      </Section>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide px-6 pt-6 pb-3">Item Details</h3>
        {(!p.items || p.items.length === 0) ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <Package className="w-8 h-8 text-gray-300 mb-3" />
            <p className="text-[13px] font-medium text-gray-500">No items found in this indent</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">SKU Code</th>
                  <th className="px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider min-w-[180px]">Item Name</th>
                  <th className="px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider min-w-[200px]">Description</th>
                  <th className="px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sub Group</th>
                  <th className="px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Qty</th>
                  <th className="px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">UOM</th>
                  <th className="px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Item Type</th>
                  <th className="px-4 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Attachment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {p.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-mono text-[12px] font-bold text-gray-800">{item.itemCode || '—'}</td>
                    <td className="px-4 py-2.5 text-[13px] font-semibold text-gray-900 whitespace-normal">{item.itemName}</td>
                    <td className="px-4 py-2.5 text-[12px] text-gray-500 whitespace-normal">{item.description || '—'}</td>
                    <td className="px-4 py-2.5 text-[12px] text-gray-600">{item.category || '—'}</td>
                    <td className="px-4 py-2.5 text-[12px] text-gray-600">{item.subGroup || '—'}</td>
                    <td className="px-4 py-2.5 text-[13px] font-bold text-gray-900 text-right">{Number(item.quantity).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-[12px] font-semibold text-gray-500 uppercase">{item.unit || 'EA'}</td>
                    <td className="px-4 py-2.5 text-[12px] text-gray-600">{item.itemType || '—'}</td>
                    <td className="px-4 py-2.5 text-[12px]">
                      {item.attachmentUrl ? (
                        <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View</a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
