'use client';

import { useState } from 'react';
import {
  X,
  Download,
  MessageSquare,
  Paperclip,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { EnterpriseCard } from '@/components/ui/enterprise-card';
import { StatusBadge } from '@/components/ui/status-badge';

interface DetailsModalProps {
  record: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string, recordId: string) => void;
}

export function DetailsModal({
  record,
  isOpen,
  onClose,
  onAction,
}: DetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview'>('overview');

  if (!isOpen || !record) return null;

  const getProgressPercentage = () => {
    const totalStages = 23;
    return (record.currentStage / totalStages) * 100;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <EnterpriseCard className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {record.referenceNo}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{record.title}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Status
              </p>
              <StatusBadge status={record.status} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Priority
              </p>
              <span className="text-sm font-semibold text-gray-900">
                {record.priority}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Requested By
              </p>
              <span className="text-sm font-semibold text-gray-900">
                {record.requestedBy?.fullName || '—'}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Stage
              </p>
              <span className="text-sm font-semibold text-gray-900">
                Stage {record.currentStage}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-700">
                Workflow Progress
              </p>
              <span className="text-xs font-medium text-gray-500">
                {Math.round(getProgressPercentage())}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0F7B45] to-[#34D399] transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>

          {/* Overview Content */}
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Project
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {record.projectName || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Vendor
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {record.vendorName || '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Created
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(record.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Description
              </p>
              <p className="text-sm text-gray-700">
                {record.description || 'No description provided.'}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </EnterpriseCard>
      </div>
    </div>
  );
}
