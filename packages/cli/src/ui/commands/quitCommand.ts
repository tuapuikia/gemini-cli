/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { formatDuration } from '../utils/formatters.js';
import { type SlashCommand } from './types.js';

export const quitCommand: SlashCommand = {
  name: 'quit',
  altName: 'exit',
  description: 'exit the cli',
  action: (context) => {
    const now = Date.now();
    const { sessionStartTime, metrics } = context.session.stats;
    const wallDuration = now - sessionStartTime.getTime();

    let totalCost = 0;
    for (const modelName in metrics.models) {
      const m = metrics.models[modelName];
      let promptCost = 0;
      if (modelName === 'gemini-2.5-pro') {
        if (m.tokens.prompt <= 200000) {
          promptCost = m.tokens.prompt * (1.25 / 1000000);
        } else {
          promptCost = m.tokens.prompt * (2.50 / 1000000);
        }
      } else if (modelName === 'gemini-2.5-flash') {
        promptCost = m.tokens.prompt * (0.30 / 1000000);
      }
      totalCost += promptCost;

      let outputCost = 0;
      if (modelName === 'gemini-2.5-pro') {
        if (m.tokens.candidates <= 200000) {
          outputCost = m.tokens.candidates * (10.00 / 1000000);
        } else {
          outputCost = m.tokens.candidates * (15.00 / 1000000);
        }
      } else if (modelName === 'gemini-2.5-flash') {
        outputCost = m.tokens.candidates * (2.50 / 1000000);
      }
      totalCost += outputCost;
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
          id: now,
        },
      ],
    };
  },
};
