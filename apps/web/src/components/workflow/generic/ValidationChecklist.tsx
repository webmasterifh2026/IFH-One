'use client';

import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ValidationResult {
  key: string;
  label: string;
  passed: boolean;
}

export function ValidationChecklist({ results }: { results: ValidationResult[] }) {
  const passedCount = results.filter((r) => r.passed).length;
  const allPassed = passedCount === results.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-gray-500">Stage validation rules</p>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
          allPassed ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-600'
        }`}>
          {passedCount}/{results.length} Passed
          {!allPassed && <AlertCircle className="w-3 h-3" />}
        </div>
      </div>

      <div className="h-1 rounded-full bg-gray-100 mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${allPassed ? 'bg-emerald-500' : 'bg-orange-400'}`}
          style={{ width: results.length ? `${(passedCount / results.length) * 100}%` : '0%' }}
        />
      </div>

      <div className="space-y-2">
        {results.map((item) => (
          <div
            key={item.key}
            className={`w-full flex items-start gap-3 p-2.5 rounded-lg border text-left transition-all duration-150 ${
              item.passed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-orange-50/50 border-orange-100'
            }`}
          >
            <div className="pt-0.5">
              {item.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-orange-400" />}
            </div>
            <p className={`text-[12px] font-bold ${item.passed ? 'text-emerald-900' : 'text-orange-900'}`}>{item.label}</p>
          </div>
        ))}
        {results.length === 0 && (
          <p className="text-[12px] text-gray-400 text-center py-4">No validation rules configured for this stage.</p>
        )}
      </div>
    </div>
  );
}
