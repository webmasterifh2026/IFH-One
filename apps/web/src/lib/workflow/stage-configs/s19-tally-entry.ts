import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

export const tallyEntryConfig: StageConfig = {
  stageNumber: 19,
  slug: 'tally-entry',
  name: 'Book Purchase in Tally',
  shortName: 'Tally Entry',
  description: 'Post the purchase bill entry in the Tally accounting system.',

  fields: [
    {
      key: 'voucherNo',
      label: 'Tally Voucher Number',
      type: 'text',
      required: true,
      bulkEditable: true,
    },
    {
      key: 'entryDate',
      label: 'Tally Entry Date',
      type: 'date',
      required: true,
      bulkEditable: true,
    },
    { key: 'ledgerName', label: 'Ledger Name', type: 'text', required: true },
    {
      key: 'vendorLedger',
      label: 'Vendor Ledger',
      type: 'text',
      required: true,
    },
    {
      key: 'purchaseLedger',
      label: 'Purchase Ledger',
      type: 'text',
      required: true,
    },
    { key: 'gstLedger', label: 'GST Ledger', type: 'text' },
    REMARKS_FIELD,
  ],
  itemFields: [],

  actions: [
    {
      action: 'APPROVE',
      label: 'Approve',
      intent: 'positive',
      requiresValidFields: true,
    },
    { action: 'HOLD', label: 'Hold', intent: 'warning', minRemarksLength: 20 },
    {
      action: 'REJECT',
      label: 'Reject',
      intent: 'negative',
      minRemarksLength: 20,
    },
  ],

  validationRules: [
    {
      key: 'billCreated',
      label: 'Bill Created (Stage 18)',
      check: (ctx) => (ctx.procurement.currentStage ?? 0) >= 18,
    },
    {
      key: 'voucherNoProvided',
      label: 'Tally Voucher Number Provided',
      check: (ctx) => !!ctx.fieldValues.voucherNo,
    },
    {
      key: 'entryDateProvided',
      label: 'Tally Entry Date Provided',
      check: (ctx) => !!ctx.fieldValues.entryDate,
    },
    {
      key: 'ledgerNameProvided',
      label: 'Ledger Name Provided',
      check: (ctx) => !!ctx.fieldValues.ledgerName,
    },
    {
      key: 'vendorLedgerProvided',
      label: 'Vendor Ledger Provided',
      check: (ctx) => !!ctx.fieldValues.vendorLedger,
    },
    {
      key: 'purchaseLedgerProvided',
      label: 'Purchase Ledger Provided',
      check: (ctx) => !!ctx.fieldValues.purchaseLedger,
    },
    {
      key: 'entryRemarksProvided',
      label: 'Entry Remarks Provided',
      check: (ctx) => (ctx.fieldValues.remarks || '').trim().length > 0,
    },
  ],

  summaryFields: [
    'requestedBy',
    'createdDate',
    'pendingSince',
    'project',
    'vendor',
    'itemsCount',
  ],
  kpis: DEFAULT_KPIS,
};
