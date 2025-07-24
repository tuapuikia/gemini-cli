/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { setGlobalDispatcher, ProxyAgent } from 'undici';
import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_FLASH_MODEL,
  DEFAULT_GEMINI_FLASH_LITE_MODEL,
} from '../config/models.js';

/**
 * Checks if the default "pro" model is rate-limited and returns a fallback "flash"
 * model if necessary. This function is designed to be silent.
 * @param apiKey The API key to use for the check.
 * @param currentConfiguredModel The model currently configured in settings.
 * @returns An object indicating the model to use, whether a switch occurred,
 *          and the original model if a switch happened.
 */
export async function getEffectiveModel(
  apiKey: string,
  currentConfiguredModel: string,
  proxy?: string,
): Promise<string> {
  // If the user has explicitly configured a model other than the default,
  // we respect that choice and do not attempt any fallback.
  if (
    currentConfiguredModel !== DEFAULT_GEMINI_MODEL &&
    currentConfiguredModel !== DEFAULT_GEMINI_FLASH_MODEL &&
    currentConfiguredModel !== DEFAULT_GEMINI_FLASH_LITE_MODEL
  ) {
    return currentConfiguredModel;
  }

  const modelsToTest = [
    DEFAULT_GEMINI_MODEL,
    DEFAULT_GEMINI_FLASH_MODEL,
    DEFAULT_GEMINI_FLASH_LITE_MODEL,
  ];

  // If the current configured model is one of the defaults, prioritize it.
  // Otherwise, start with the highest-tier default model.
  let startingModelIndex = modelsToTest.indexOf(currentConfiguredModel);
  if (startingModelIndex === -1) {
    startingModelIndex = 0; // Start with DEFAULT_GEMINI_MODEL if current is not a default
  }

  for (let i = startingModelIndex; i < modelsToTest.length; i++) {
    const modelToTest = modelsToTest[i];
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTest}:generateContent`;
    const thinkingBudgetStr = process.env.GEMINI_THINKING_BUDGET;
    const thinkingBudget =
      thinkingBudgetStr && /^\d+$/.test(thinkingBudgetStr)
        ? parseInt(thinkingBudgetStr, 10)
        : 128;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: 'test' }] }],
      generationConfig: {
        maxOutputTokens: 1,
        temperature: 0,
        topK: 1,
        topP: 0,
        thinkingConfig: { thinkingBudget, includeThoughts: false },
      },
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2-second timeout for the request

    try {
      if (proxy) {
        setGlobalDispatcher(new ProxyAgent(proxy));
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        console.log(
          `[INFO] Model ${modelToTest} was temporarily unavailable. Attempting next fallback model.`,
        );
        continue; // Try the next model in the list
      }
      // If successful or any other non-429 error, use this model.
      return modelToTest;
    } catch (_error) {
      clearTimeout(timeoutId);
      // On timeout or any other fetch error, try the next model.
      console.log(
        `[INFO] Failed to reach model ${modelToTest}. Attempting next fallback model.`,
      );
      continue;
    }
  }

  // If all models failed, return the originally configured model as a last resort.
  // This ensures we don't return undefined or an empty string.
  console.warn(
    `[WARNING] All fallback models failed. Sticking with originally configured model: ${currentConfiguredModel}.`,
  );
  return currentConfiguredModel;
}
