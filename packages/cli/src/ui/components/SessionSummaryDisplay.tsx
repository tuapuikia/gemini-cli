/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StatsDisplay } from './StatsDisplay.js';

interface SessionSummaryDisplayProps {
  duration: string;
  totalCost?: number;
  totalPromptCost?: number;
  totalOutputCost?: number;
}

export const SessionSummaryDisplay: React.FC<SessionSummaryDisplayProps> = ({
  duration,
  totalCost,
  totalPromptCost,
  totalOutputCost,
}) => (
  <StatsDisplay
    title="Agent powering down. Goodbye!"
    duration={duration}
    totalCost={totalCost}
    totalPromptCost={totalPromptCost}
    totalOutputCost={totalOutputCost}
  />
);
