// Deepgram API key management with runtime updates
// This service allows the Electron app to inject API keys at runtime

let apiKey = process.env.DEEPGRAM_API_KEY || null;

/**
 * Get the current Deepgram API key
 */
export function getApiKey() {
  return apiKey;
}

/**
 * Set the Deepgram API key at runtime
 * Used by Electron to inject keys from OS keychain
 */
export function setApiKey(key) {
  apiKey = key;
}
