import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

export const paymentAdviceConfig: StageConfig = {
  stageNumber: 22,
  slug: 'payment-advice',
  name: 'Payment Advice',
  shortName: 'Payment',
  description:
    'Issue payment advice to vendor and close the procurement lifecycle.',

  fields: [
    {
      key: 'adviceNo',
      label: 'Payment Advice Number',
      type: 'text',
      required: true,
      bulkEditable: true,
    },
    {
      key: 'payDate',
      label: 'Payment Date',
      type: 'date',
      required: true,
      bulkEditable: true,
    },
    {
      key: 'payMode',
      label: 'Payment Mode',
      type: 'select',
      required: true,
      bulkEditable: true,
      options: [
        { value: 'NEFT', label: 'NEFT' },
        { value: 'RTGS', label: 'RTGS' },
        { value: 'IMPS', label: 'IMPS' },
        { value: 'CHEQUE', label: 'Cheque' },
        { value: 'DD', label: 'DD' },
      ],
    },
    { key: 'vendorName', label: 'Vendor Name', type: 'text', required: true },
    {
      key: 'bankDetails',
      label: 'Vendor Bank Details',
      type: 'text',
      required: true,
    },
    { key: 'invoiceNo', label: 'Invoice Number', type: 'text', required: true },
    { key: 'poNo', label: 'PO Number', type: 'text', required: true },
    { key: 'billNo', label: 'Bill Number', type: 'text' },
    {
      key: 'tallyVoucher',
      label: 'Tally Voucher Number',
      type: 'text',
      required: true,
    },
    {
      key: 'payableAmount',
      label: 'Payable Amount',
      type: 'number',
      currency: true,
      required: true,
      bulkEditable: true,
    },
    {
      key: 'tdsAmount',
      label: 'TDS Amount',
      type: 'number',
      currency: true,
      bulkEditable: true,
    },
    { key: 'gstAmount', label: 'GST Amount', type: 'number', currency: true },
    {
      key: 'netPayment',
      label: 'Net Payment',
      type: 'number',
      currency: true,
      readOnly: true,
    },
    REMARKS_FIELD,
  ],
  itemFields: [],

  actions: [
    {
      action: 'APPROVE',
      label: 'Release Payment',
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
      key: 'poApproved',
      label: 'PO Approved',
      check: (ctx) => (ctx.procurement.currentStage ?? 0) >= 9,
    },
    {
      key: 'materialReceived',
      label: 'Material Received',
      check: (ctx) => (ctx.procurement.currentStage ?? 0) >= 11,
    },
    {
      key: 'inspectionCompleted',
      label: 'Inspection Completed',
      check: (ctx) => (ctx.procurement.currentStage ?? 0) >= 14,
    },
    {
      key: 'billCreated',
      label: 'Bill Created',
      check: (ctx) => (ctx.procurement.currentStage ?? 0) >= 18,
    },
    {
      key: 'tallyEntryCompleted',
      label: 'Tally Entry Completed',
      check: (ctx) => (ctx.procurement.currentStage ?? 0) >= 19,
    },
    {
      key: 'billApprovalsComplete',
      label: 'Bill Approval L1/L2 Approved',
      check: (ctx) => (ctx.procurement.currentStage ?? 0) >= 22,
    },
    {
      key: 'vendorDetailsAvailable',
      label: 'Vendor Details Available',
      check: (ctx) =>
        !!ctx.fieldValues.vendorName && !!ctx.fieldValues.bankDetails,
    },
    {
      key: 'adviceNoProvided',
      label: 'Payment Advice Number Provided',
      check: (ctx) => !!ctx.fieldValues.adviceNo,
    },
    {
      key: 'payDateProvided',
      label: 'Payment Date Provided',
      check: (ctx) => !!ctx.fieldValues.payDate,
    },
    {
      key: 'invoiceNoProvided',
      label: 'Invoice Number Provided',
      check: (ctx) => !!ctx.fieldValues.invoiceNo,
    },
    {
      key: 'poNoProvided',
      label: 'PO Number Provided',
      check: (ctx) => !!ctx.fieldValues.poNo,
    },
    {
      key: 'tallyVoucherProvided',
      label: 'Tally Voucher Number Provided',
      check: (ctx) => !!ctx.fieldValues.tallyVoucher,
    },
    {
      key: 'payableAmountProvided',
      label: 'Payable Amount Provided',
      check: (ctx) => !!ctx.fieldValues.payableAmount,
    },
    {
      key: 'paymentRemarksProvided',
      label: 'Payment Remarks Provided',
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
