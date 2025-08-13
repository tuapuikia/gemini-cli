/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CountTokensResponse,
  GenerateContentResponse,
  GenerateContentParameters,
  CountTokensParameters,
  EmbedContentResponse,
  EmbedContentParameters,
} from '@google/genai';
import { ContentGenerator, AuthType } from './contentGenerator.js';
import { UserTierId } from '../code_assist/types.js';

export class RequestCountingContentGenerator implements ContentGenerator {
  private static requestCount = 0;
  public userTier?: UserTierId;

  constructor(private wrappedGenerator: ContentGenerator) {
    this.userTier = wrappedGenerator.userTier;
  }

  static getRequestCount(): number {
    return RequestCountingContentGenerator.requestCount;
  }

  async generateContent(
    request: GenerateContentParameters,
  ): Promise<GenerateContentResponse> {
    RequestCountingContentGenerator.requestCount++;
    return this.wrappedGenerator.generateContent(request, 'placeholder-user-prompt-id');
  }

  async generateContentStream(
    request: GenerateContentParameters,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    RequestCountingContentGenerator.requestCount++;
    return this.wrappedGenerator.generateContentStream(request, 'placeholder-user-prompt-id');
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    RequestCountingContentGenerator.requestCount++;
    return this.wrappedGenerator.countTokens(request);
  }

  async embedContent(
    request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    RequestCountingContentGenerator.requestCount++;
    return this.wrappedGenerator.embedContent(request);
  }
}
