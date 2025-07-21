/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { getErrorMessage } from '@google/gemini-cli-core';
import { MessageType } from '../types.js';
import { CommandContext, SlashCommand, MessageActionReturn, CommandKind } from './types.js';

export const modelCommand: SlashCommand = {
  name: 'model',
  description: 'Switch the generative model for the current session.',
  kind: CommandKind.BUILT_IN,
  action: async (context: CommandContext, args: string): Promise<MessageActionReturn> => {
    const modelName = args.trim();

    if (!modelName) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Please provide a model name. Usage: /model <model_name>',
      };
    }

    if (!context.services.config) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Configuration service not available.',
      };
    }

    try {
      context.services.config.setModel(modelName);
      return {
        type: 'message',
        messageType: 'info',
        content: `Model successfully switched to: ${modelName}`,
      };
    } catch (error) {
      return {
        type: 'message',
        messageType: 'error',
        content: `Failed to switch model: ${getErrorMessage(error)}`,
      };
    }
  },
  completion: async (context: CommandContext, partialArg: string): Promise<string[]> => {
    const availableModels = [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite-preview-06-17',
    ];
    return availableModels.filter(model => model.startsWith(partialArg));
  },
};
