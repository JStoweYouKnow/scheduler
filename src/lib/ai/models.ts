import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  NEBIUS_BASE_URL,
  nebiusFetch,
  transformNebiusRequestBody,
} from "./nebius";

export const DEFAULT_MODEL_REASONING = "nvidia/nemotron-3-super-120b-a12b";
export const DEFAULT_MODEL_FAST = "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B";
export const DEFAULT_MODEL_ULTRA = "nvidia/Nemotron-3-Ultra-550b-a55b";

export function modelReasoningId(): string {
  return process.env.MODEL_REASONING?.trim() || DEFAULT_MODEL_REASONING;
}

export function modelFastId(): string {
  return process.env.MODEL_FAST?.trim() || DEFAULT_MODEL_FAST;
}

export function modelUltraId(): string {
  return process.env.MODEL_ULTRA?.trim() || DEFAULT_MODEL_ULTRA;
}

export function requireNebiusApiKey(): string {
  const key = process.env.NEBIUS_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing required environment variable: NEBIUS_API_KEY");
  }
  return key;
}

export function hasNebius(): boolean {
  return Boolean(process.env.NEBIUS_API_KEY?.trim());
}

export function nebiusProvider() {
  return createOpenAICompatible({
    name: "nebius",
    apiKey: requireNebiusApiKey(),
    baseURL: NEBIUS_BASE_URL,
    fetch: nebiusFetch,
    transformRequestBody: (body) => transformNebiusRequestBody(body),
  });
}

export function reasoningModel() {
  return nebiusProvider()(modelReasoningId());
}

export function fastModel() {
  return nebiusProvider()(modelFastId());
}

export function ultraModel() {
  return nebiusProvider()(modelUltraId());
}
