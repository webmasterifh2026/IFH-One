const fs = require('fs');

const generateContent = (componentName, title, description, stage, slug) =>
  `'use client';\n\nimport { FinanceQueuePage } from '@/components/workflow/finance-queue-page';\n\nexport default function ${componentName}() {\n  return (\n    <FinanceQueuePage\n      title="${title}"\n      description="${description}"\n      stage={${stage}}\n      slug="${slug}"\n    />\n  );\n}\n`;

const updates = [
  { path: 'apps/web/src/app/(private)/bill-to-accounts/page.tsx', code: generateContent('BillToAccountsPage', 'Bill Sent To Accounts', 'Stage 16 — Vendor bill forwarded to Accounts', 16, 'bill-to-accounts') },
  { path: 'apps/web/src/app/(private)/bill-to-purchase/page.tsx', code: generateContent('BillToPurchasePage', 'Bill Sent To Purchase', 'Stage 17 — Bill verified and sent to Purchase', 17, 'bill-to-purchase') },
  { path: 'apps/web/src/app/(private)/bill-creation/page.tsx', code: generateContent('BillCreationPage', 'Bill Creation', 'Stage 18 — Finance team records the vendor bill', 18, 'bill-creation') },
  { path: 'apps/web/src/app/(private)/tally-entry/page.tsx', code: generateContent('TallyEntryPage', 'Tally Entry', 'Stage 19 — Record bill in accounting system', 19, 'tally-entry') },
  { path: 'apps/web/src/app/(private)/bill-approval-l1/page.tsx', code: generateContent('BillApprovalL1Page', 'Bill Approval L1', 'Stage 20 — Primary approval of recorded bill', 20, 'bill-approval-l1') },
  { path: 'apps/web/src/app/(private)/bill-approval-l2/page.tsx', code: generateContent('BillApprovalL2Page', 'Bill Approval L2', 'Stage 21 — Final management approval of bill', 21, 'bill-approval-l2') },
  { path: 'apps/web/src/app/(private)/payment-advice/page.tsx', code: generateContent('PaymentAdvicePage', 'Payment Advice', 'Stage 22 — Generate final payment advice', 22, 'payment-advice') },
];

for (const {path, code} of updates) {
  fs.writeFileSync(path, code, 'utf8');
  console.log('Updated', path);
}
