'use client';

import { useMemo } from 'react';
import type { StageConfig, StageValidationContext } from './stage-config-types';
import type { Procurement } from '@/lib/api/procurement';

interface ParsedStageMetadata {
  fieldValues: Record<string, any>;
  itemFieldValues: Record<string, Record<string, any>>;
}

function parseCurrentStageMetadata(
  procurement: Procurement,
  stageNumber: number
): ParsedStageMetadata {
  const stage = procurement.stages.find((s) => s.stageNumber === stageNumber);
  if (!stage?.metadata) return { fieldValues: {}, itemFieldValues: {} };
  try {
    const parsed = JSON.parse(stage.metadata);
    return {
      fieldValues: parsed.fieldValues || {},
      itemFieldValues: parsed.itemFieldValues || {},
    };
  } catch {
    return { fieldValues: {}, itemFieldValues: {} };
  }
}

/**
 * Read-only counterpart of the field-value pipeline (v2.8.4). Reads the last
 * persisted stage-level and per-item field values from
 * ProcurementStage.metadata (written by the Bulk Update feature) purely for
 * display — there is no local editable state, no setters, and no submit
 * payload builder, since this detail view can never write back to the
 * server.
 */
export function useStageFieldValues(
  procurement: Procurement,
  config: StageConfig
) {
  const { fieldValues, itemFieldValues } = useMemo(
    () => parseCurrentStageMetadata(procurement, config.stageNumber),
    [procurement, config.stageNumber]
  );

  const validationContext: StageValidationContext = {
    procurement,
    fieldValues,
    itemFieldValues,
  };

  const validationResults = config.validationRules.map((rule) => ({
    key: rule.key,
    label: rule.label,
    passed: (() => {
      try {
        return rule.check(validationContext);
      } catch {
        return false;
      }
    })(),
  }));

  return { fieldValues, itemFieldValues, validationResults };
}
