'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/fetch';

export default function CreateRolePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Role name is required.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/roles', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim().toUpperCase(), description: description.trim(), status }),
      });

      router.push('/roles');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-2xl mx-auto px-8 py-10">
        {/* Back Navigation */}
        <Link
          href="/roles"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Roles
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-display italic font-medium text-[28px] leading-tight tracking-tight text-gray-900">
            Create New Role
          </h1>
          <p className="text-[15px] text-gray-500 mt-1.5 font-medium">
            Define a new role with a name and description. You can assign permissions after creation.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200/60 px-4 py-3 text-[13px] text-red-700 font-medium">
                {error}
              </div>
            )}

            {/* Role Name */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Role Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Purchase Manager"
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45] transition-all"
              />
              <p className="text-[12px] text-gray-400 mt-1.5">
                Will be converted to uppercase. Must be unique across the system.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the responsibilities and access level of this role..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45] transition-all resize-none"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-[13px] font-semibold text-gray-700 mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45] transition-all appearance-none"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <Link
                href="/roles"
                className="inline-flex items-center justify-center h-11 px-5 rounded-xl border border-gray-200 text-[14px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-[#0F7B45] text-white text-[14px] font-semibold hover:bg-[#0A5C34] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Shield className="w-4 h-4" />
                {loading ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
