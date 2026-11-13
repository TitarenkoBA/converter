/**
 * Offline license verification.
 *
 * Payments are not integrated yet, so no key is valid. Intended design: the payment backend
 * issues keys signed with a private Ed25519 key; the public key is embedded here and the
 * signature is checked with WebCrypto, so activation works without network access.
 */
export async function verifyLicenseKey(_key: string): Promise<boolean> {
  return false;
}
