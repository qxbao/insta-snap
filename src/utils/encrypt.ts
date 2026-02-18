const IVLength = 12

export class Encryptor {
  // This key is non-extractable
  private key: CryptoKey | null = null

  constructor(key?: CryptoKey) {
    if (key) {
      this.key = key
    }
  }

  static async new(key?: CryptoKey): Promise<Encryptor> {
    key
      = key
        || (await crypto.subtle.generateKey(
          {
            name: "AES-GCM",
            length: 256,
          },
          false,
          ["encrypt", "decrypt"],
        ))
    const encryptor = new Encryptor(key)
    return encryptor
  }

  async encrypt(data: string): Promise<{ encrypted: ArrayBuffer, iv: Uint8Array }> {
    if (!this.key) throw new Error("Encryptor not initialized")

    const encoder = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(IVLength))

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.key,
      encoder.encode(data),
    )

    return { encrypted, iv }
  }

  async decrypt(encryptedData: ArrayBuffer, iv: BufferSource): Promise<string> {
    if (!this.key) throw new Error("Encryptor not initialized")

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      this.key,
      encryptedData,
    )

    return new TextDecoder().decode(decryptedBuffer)
  }

  public getKey(): CryptoKey | null {
    return this.key
  }
}
