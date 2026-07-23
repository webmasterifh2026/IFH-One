import type { StageConfig } from './stage-config-types';
import { indentVerificationConfig } from './stage-configs/s1-indent-verification';
import { storeCheckConfig } from './stage-configs/s2-store-check';
import { rfqConfig } from './stage-configs/s3-rfq';
import { technoCommercialConfig } from './stage-configs/s4-techno-commercial';
import { negotiationConfig } from './stage-configs/s5-negotiation';
import { poCreationConfig } from './stage-configs/s6-po-creation';
import {
  poApprovalL1Config,
  poApprovalL2Config,
} from './stage-configs/s7-s8-po-approval';
import { vendorAcceptanceConfig } from './stage-configs/s9-vendor-acceptance';
import { vendorFollowUpConfig } from './stage-configs/s10-vendor-follow-up';
import { materialReceiptConfig } from './stage-configs/s11-material-receipt';
import {
  materialInspectionConfig,
  secondaryInspectionConfig,
  finalInspectionConfig,
} from './stage-configs/s12-s13-s14-inspections';
import { debitNoteConfig } from './stage-configs/s15-debit-note';
import { billToAccountsConfig } from './stage-configs/s16-bill-to-accounts';
import { billToPurchaseConfig } from './stage-configs/s17-bill-to-purchase';
import { billCreationConfig } from './stage-configs/s18-bill-creation';
import { tallyEntryConfig } from './stage-configs/s19-tally-entry';
import {
  billApprovalL1Config,
  billApprovalL2Config,
} from './stage-configs/s20-s21-bill-approval';
import { paymentAdviceConfig } from './stage-configs/s22-payment-advice';

/** Registry of every actionable procurement stage (1–22) driving the generic StageWorkspace. */
export const STAGE_CONFIGS: StageConfig[] = [
  indentVerificationConfig,
  storeCheckConfig,
  rfqConfig,
  technoCommercialConfig,
  negotiationConfig,
  poCreationConfig,
  poApprovalL1Config,
  poApprovalL2Config,
  vendorAcceptanceConfig,
  vendorFollowUpConfig,
  materialReceiptConfig,
  materialInspectionConfig,
  secondaryInspectionConfig,
  finalInspectionConfig,
  debitNoteConfig,
  billToAccountsConfig,
  billToPurchaseConfig,
  billCreationConfig,
  tallyEntryConfig,
  billApprovalL1Config,
  billApprovalL2Config,
  paymentAdviceConfig,
];

const BY_STAGE_NUMBER = new Map(STAGE_CONFIGS.map((c) => [c.stageNumber, c]));
const BY_SLUG = new Map(STAGE_CONFIGS.map((c) => [c.slug, c]));

export function getStageConfigByNumber(
  stageNumber: number
): StageConfig | undefined {
  return BY_STAGE_NUMBER.get(stageNumber);
}

export function getStageConfigBySlug(slug: string): StageConfig | undefined {
  return BY_SLUG.get(slug);
}
