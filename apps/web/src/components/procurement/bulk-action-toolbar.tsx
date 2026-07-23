'use client';

import { GitBranch, UserPlus, MessageSquare, StickyNote, Download, X } from 'lucide-react';

interface BulkActionToolbarProps {
  selectedCount: number;
  onChangeStage: () => void;
  onAssignUser?: () => void;
  onAddRemarks?: () => void;
  onAddNotes?: () => void;
  onExport?: () => void;
  onClear: () => void;
}

export function BulkActionToolbar({
  selectedCount,
  onChangeStage,
  onAssignUser,
  onAddRemarks,
  onAddNotes,
  onExport,
  onClear,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-4 z-30 flex justify-center px-4">
      <div className="flex items-center gap-2 rounded-2xl bg-gray-900 text-white shadow-2xl shadow-black/20 px-4 py-3 max-w-full overflow-x-auto">
        <span className="text-[13px] font-semibold whitespace-nowrap pr-3 border-r border-white/15">
          {selectedCount} {selectedCount === 1 ? 'Record' : 'Records'} Selected
        </span>

        <button
          onClick={onChangeStage}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#0F7B45] hover:bg-[#0A5C34] text-[12.5px] font-semibold transition-colors whitespace-nowrap"
        >
          <GitBranch className="w-3.5 h-3.5" />
          Change Workflow Stage
        </button>

        {onAssignUser && (
          <button
            onClick={onAssignUser}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-[12.5px] font-semibold transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Assign User
          </button>
        )}

        {onAddRemarks && (
          <button
            onClick={onAddRemarks}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-[12.5px] font-semibold transition-colors whitespace-nowrap"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Add Remarks
          </button>
        )}

        {onAddNotes && (
          <button
            onClick={onAddNotes}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-[12.5px] font-semibold transition-colors whitespace-nowrap"
          >
            <StickyNote className="w-3.5 h-3.5" />
            Internal Notes
          </button>
        )}

        {onExport && (
          <button
            onClick={onExport}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-[12.5px] font-semibold transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Export Selected
          </button>
        )}

        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl hover:bg-white/10 text-[12.5px] font-semibold transition-colors whitespace-nowrap ml-1"
        >
          <X className="w-3.5 h-3.5" />
          Clear Selection
        </button>
      </div>
    </div>
  );
}
