/** Stage-to-route mapping for workflow modules */
export const WORKFLOW_ROUTES: Record<
  number,
  { list: string; detail?: (id: string) => string }
> = {
  0: { list: '/indents', detail: (id) => `/procurement/${id}` },
  1: {
    list: '/indent-verification',
    detail: (id) => `/indent-verification/${id}`,
  },
  2: { list: '/store-check', detail: (id) => `/store-check/${id}` },
  3: { list: '/rfq', detail: (id) => `/procurement/${id}` },
  4: {
    list: '/techno-commercial-evaluation',
    detail: (id) => `/procurement/${id}`,
  },
  5: { list: '/negotiation', detail: (id) => `/procurement/${id}` },
  6: { list: '/purchase-orders', detail: (id) => `/procurement/${id}` },
  7: { list: '/po-approval-l1', detail: (id) => `/procurement/${id}` },
  8: { list: '/po-approval-l2', detail: (id) => `/procurement/${id}` },
  9: { list: '/vendor-acceptance', detail: (id) => `/procurement/${id}` },
  10: { list: '/vendor-follow-up', detail: (id) => `/procurement/${id}` },
  11: { list: '/material-receipt', detail: (id) => `/procurement/${id}` },
  12: { list: '/material-inspection', detail: (id) => `/procurement/${id}` },
  13: { list: '/secondary-inspection', detail: (id) => `/procurement/${id}` },
  14: { list: '/final-inspection', detail: (id) => `/procurement/${id}` },
  15: { list: '/debit-note', detail: (id) => `/procurement/${id}` },
  16: { list: '/bill-to-accounts', detail: (id) => `/procurement/${id}` },
  17: { list: '/bill-to-purchase', detail: (id) => `/procurement/${id}` },
  18: { list: '/bill-creation', detail: (id) => `/procurement/${id}` },
  19: { list: '/tally-entry', detail: (id) => `/procurement/${id}` },
  20: { list: '/bill-approval-l1', detail: (id) => `/procurement/${id}` },
  21: { list: '/bill-approval-l2', detail: (id) => `/procurement/${id}` },
  22: { list: '/payment-advice', detail: (id) => `/procurement/${id}` },
  23: { list: '/procurement', detail: (id) => `/procurement/${id}` },
};

export function getDetailHref(stage: number, id: string): string {
  return WORKFLOW_ROUTES[stage]?.detail?.(id) ?? `/procurement/${id}`;
}
