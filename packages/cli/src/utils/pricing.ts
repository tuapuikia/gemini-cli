/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { ModelMetrics } from '../ui/contexts/SessionContext.js';

interface ModelPricing {
  input: {
    tier1: number; // <= 200k tokens
    tier2: number; // > 200k tokens
  };
  output: {
    tier1: number; // <= 200k tokens
    tier2: number; // > 200k tokens
  };
  contextCaching: {
    tier1: number; // <= 200k tokens
    tier2: number; // > 200k tokens
  };
}

interface ModelPricingFlash {
  input: number;
  output: number;
  contextCaching: number;
}

const PRICING_PER_MILLION_TOKENS: Record<string, ModelPricing | ModelPricingFlash> = {
  'gemini-2.5-pro': {
    input: { tier1: 1.25, tier2: 2.50 },
    output: { tier1: 10.00, tier2: 15.00 },
    contextCaching: { tier1: 0.31, tier2: 0.625 },
  } as ModelPricing,
  'gemini-2.5-flash': {
    input: 0.30,
    output: 2.50,
    contextCaching: 0.075,
  } as ModelPricingFlash,
};

export function calculatePromptCost(metrics: ModelMetrics): number {
  const pricing = PRICING_PER_MILLION_TOKENS[metrics.modelName];
  let cost = 0;

  if (!pricing) {
    return 0;
  }

  if (metrics.modelName === 'gemini-2.5-pro') {
    const proPricing = pricing as ModelPricing;
    const uncachedTokens = metrics.tokens.prompt - metrics.tokens.cached;

    if (metrics.tokens.prompt <= 200000) {
      cost += metrics.tokens.cached * (proPricing.contextCaching.tier1 / 1000000);
      cost += uncachedTokens * (proPricing.input.tier1 / 1000000);
    } else {
      cost += metrics.tokens.cached * (proPricing.contextCaching.tier2 / 1000000);
      cost += uncachedTokens * (proPricing.input.tier2 / 1000000);
    }
  } else if (metrics.modelName === 'gemini-2.5-flash') {
    const flashPricing = pricing as ModelPricingFlash;
    const uncachedTokens = metrics.tokens.prompt - metrics.tokens.cached;
    cost += metrics.tokens.cached * (flashPricing.contextCaching / 1000000);
    cost += uncachedTokens * (flashPricing.input / 1000000);
  }

  return cost;
}

export function calculateOutputCost(metrics: ModelMetrics): number {
  const pricing = PRICING_PER_MILLION_TOKENS[metrics.modelName];
  let cost = 0;

  if (!pricing) {
    return 0;
  }

  if (metrics.modelName === 'gemini-2.5-pro') {
    const proPricing = pricing as ModelPricing;
    const totalOutputTokens = metrics.tokens.candidates + metrics.tokens.thoughts;
    if (totalOutputTokens <= 200000) {
      cost += totalOutputTokens * (proPricing.output.tier1 / 1000000);
    } else {
      cost += totalOutputTokens * (proPricing.output.tier2 / 1000000);
    }
  } else if (metrics.modelName === 'gemini-2.5-flash') {
    const flashPricing = pricing as ModelPricingFlash;
    cost += (metrics.tokens.candidates + metrics.tokens.thoughts) * (flashPricing.output / 1000000);
  }

  return cost;
}

export function calculateModelCost(metrics: ModelMetrics): number {
  return calculatePromptCost(metrics) + calculateOutputCost(metrics);
}
