'use client';

import { FileText, Eye, Download } from 'lucide-react';
import type { ProcurementAttachment } from '@/lib/api/procurement';

export function DocumentsTab({ attachments }: { attachments: ProcurementAttachment[] }) {
  if (attachments.length === 0) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center flex flex-col items-center">
          <FileText className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-[14px] font-bold text-gray-900 mb-1">No documents uploaded</h3>
          <p className="text-[13px] text-gray-500">There are no files attached to this indent yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {attachments.map((att) => (
          <div key={att.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-gray-300 transition-colors group">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 truncate" title={att.fileName}>{att.fileName}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{att.fileType} · {att.fileSize ? `${Math.round(att.fileSize / 1024)} KB` : 'Unknown size'}</p>
                <p className="text-[10px] text-gray-400 mt-1">Uploaded by {att.uploadedBy.fullName}</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
              <a href={att.fileUrl} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-[11px] font-bold text-gray-700 transition-colors">
                <Eye className="w-3.5 h-3.5" /> Preview
              </a>
              <a href={att.fileUrl} download className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-[11px] font-bold text-gray-700 transition-colors">
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
