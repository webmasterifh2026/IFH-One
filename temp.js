const fs = require('fs');
let content = fs.readFileSync('apps/web/src/components/procurement-execution/DynamicStageRenderer.tsx', 'utf8');
const oldRegex = /\/\/\s*═══════════════════════════════════════════════════════════════════════════════\n\/\/\s*STAGE 12 — INSPECTION 1 \(Primary\)[\s\S]*?\/\/\s*═══════════════════════════════════════════════════════════════════════════════\n\/\/\s*STAGE 15 — DEBIT NOTE PREPARATION/;
const newFunction = `// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 12, 13, 14 — INSPECTION
// ═══════════════════════════════════════════════════════════════════════════════
function StageInspection({ level, procurement, onUpdate }: Props & { level: 1 | 2 | 3 }) {
  const [itemsStatus, setItemsStatus] = useState<Record<string, { status: 'APPROVED' | 'REJECTED'; remarks: string }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pendingItems = procurement.items.filter((i: any) => i.finalInspectionResult !== 'APPROVED' && !i.debitNoteGenerated && Number(i.quantity) > 0);

  const handleStatusChange = (itemId: string, status: 'APPROVED' | 'REJECTED') => {
    setItemsStatus(prev => ({ ...prev, [itemId]: { ...prev[itemId], status } }));
  };

  const handleRemarksChange = (itemId: string, remarks: string) => {
    setItemsStatus(prev => ({ ...prev, [itemId]: { ...prev[itemId], remarks } }));
  };

  const handleSubmit = async () => {
    if (pendingItems.length !== Object.keys(itemsStatus).length) {
      setError('Please select Approved or Rejected for all items.');
      return;
    }
    
    for (const itemId of Object.keys(itemsStatus)) {
      if (itemsStatus[itemId].status === 'REJECTED' && (!itemsStatus[itemId].remarks || itemsStatus[itemId].remarks.trim().length === 0)) {
        setError('Remarks are mandatory for rejected items.');
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      const payload = Object.keys(itemsStatus).map(id => ({
        procurementItemId: id,
        status: itemsStatus[id].status,
        remarks: itemsStatus[id].remarks,
      }));
      await submitInspection(procurement.id, level, payload);
      const { getProcurement } = await import('@/lib/api/procurement');
      const updated = await getProcurement(procurement.id);
      onUpdate(updated);
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (pendingItems.length === 0) return <div className="text-sm text-gray-500">No items pending inspection.</div>;

  return (
    <div className="space-y-4">
      {error && <div className="text-red-600 text-sm p-2 bg-red-50 rounded border border-red-200">{error}</div>}
      <div className="space-y-3">
        {pendingItems.map((item: any) => (
          <div key={item.id} className="border p-3 rounded-lg bg-white shadow-sm">
            <div className="font-semibold text-sm mb-2 text-gray-800">{item.itemName} (Qty: {item.quantity})</div>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name={\`status-\${item.id}\`} checked={itemsStatus[item.id]?.status === 'APPROVED'} onChange={() => handleStatusChange(item.id, 'APPROVED')} className="accent-[#0F7B45]" />
                Approve
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name={\`status-\${item.id}\`} checked={itemsStatus[item.id]?.status === 'REJECTED'} onChange={() => handleStatusChange(item.id, 'REJECTED')} className="accent-[#DC2626]" />
                Reject
              </label>
            </div>
            <input
              type="text"
              placeholder="Remarks (required if rejected)"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45]"
              value={itemsStatus[item.id]?.remarks || ''}
              onChange={(e) => handleRemarksChange(item.id, e.target.value)}
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full px-4 py-2.5 bg-[#0F7B45] hover:bg-[#0c6237] text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Inspection'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 15 — DEBIT NOTE PREPARATION`;
if (oldRegex.test(content)) {
  content = content.replace(oldRegex, newFunction);
  fs.writeFileSync('apps/web/src/components/procurement-execution/DynamicStageRenderer.tsx', content);
  console.log('Successfully updated DynamicStageRenderer.tsx');
} else {
  console.log('Could not find the block to replace.');
}
