/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { formatDuration } from '../utils/formatters.js';
import { calculateModelCost, calculatePromptCost, calculateOutputCost } from '../../utils/pricing.js';
import { CommandKind, type SlashCommand } from './types.js';

export const quitCommand: SlashCommand = {
  name: 'quit',
  altNames: ['exit'],
  description: 'exit the cli',
  kind: CommandKind.BUILT_IN,
  action: (context) => {
    const now = Date.now();
    const { sessionStartTime, metrics } = context.session.stats;
    const wallDuration = now - sessionStartTime.getTime();

    let totalCost = 0;
    let totalPromptCost = 0;
    let totalOutputCost = 0;
    for (const modelName in metrics.models) {
      const m = metrics.models[modelName];
      const modelMetrics = {
        modelName,
        api: {
          totalRequests: m.api.totalRequests,
          totalErrors: m.api.totalErrors,
          totalLatencyMs: m.api.totalLatencyMs,
        },
        tokens: m.tokens,
      };
      totalCost += calculateModelCost(modelMetrics);
      totalPromptCost += calculatePromptCost(modelMetrics);
      totalOutputCost += calculateOutputCost(modelMetrics);
    }

    return {
      type: 'quit',
      messages: [
        {
          type: 'user',
          text: `/quit`, // Keep it consistent, even if /exit was used
          id: now - 1,
        },
        {
          type: 'quit',
          duration: formatDuration(wallDuration),
          totalCost: totalCost,
          totalPromptCost: totalPromptCost,
          totalOutputCost: totalOutputCost,
          id: now,
        },
      ],
    };
  },
};
