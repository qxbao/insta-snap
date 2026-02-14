import { describe, it, expect, beforeEach } from "vitest";
import { Encryptor } from "../../utils/encrypt";

describe("Encryptor", () => {
  let encryptor: Encryptor;

  beforeEach(async () => {
    encryptor = await Encryptor.new();
  });

  describe("Encryption/Decryption", () => {
    it("should encrypt and decrypt string data", async () => {
      const plaintext = "test-secret-data";

      const { encrypted, iv } = await encryptor.encrypt(plaintext);
      const decrypted = await encryptor.decrypt(encrypted, new Uint8Array(iv));

      expect(decrypted).toBe(plaintext);
    });

    it("should handle empty strings", async () => {
      const plaintext = "";

      const { encrypted, iv } = await encryptor.encrypt(plaintext);
      const decrypted = await encryptor.decrypt(encrypted, new Uint8Array(iv));

      expect(decrypted).toBe(plaintext);
    });

    it("should handle unicode characters", async () => {
      const plaintext = "Hello 世界 🌍";

      const { encrypted, iv } = await encryptor.encrypt(plaintext);
      const decrypted = await encryptor.decrypt(encrypted, new Uint8Array(iv));

      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertext for same plaintext", async () => {
      const plaintext = "test-data";

      const result1 = await encryptor.encrypt(plaintext);
      const result2 = await encryptor.encrypt(plaintext);

      // Due to random IV, IVs should differ
      expect(result1.iv).not.toEqual(result2.iv);

      // Convert ArrayBuffers to Uint8Array for comparison
      const enc1 = new Uint8Array(result1.encrypted);
      const enc2 = new Uint8Array(result2.encrypted);

      // They should have some differences
      let hasDifference = false;
      for (let i = 0; i < Math.min(enc1.length, enc2.length); i++) {
        if (enc1[i] !== enc2[i]) {
          hasDifference = true;
          break;
        }
      }
      expect(hasDifference).toBe(true);
    });

    it("should fail decryption with corrupted data", async () => {
      const plaintext = "test-data";
      const { encrypted, iv } = await encryptor.encrypt(plaintext);

      // Corrupt the encrypted data
      const corruptedData = new Uint8Array(encrypted);
      corruptedData[10] = (corruptedData[10] + 1) % 256;

      await expect(
        encryptor.decrypt(corruptedData.buffer, new Uint8Array(iv)),
      ).rejects.toThrow();
    });

    it("should fail decryption with wrong IV", async () => {
      const plaintext = "test-data";
      const { encrypted } = await encryptor.encrypt(plaintext);
      const wrongIV = crypto.getRandomValues(new Uint8Array(12));

      await expect(encryptor.decrypt(encrypted, wrongIV)).rejects.toThrow();
    });
  });

  describe("Key Management", () => {
    it("should throw error if encrypting without key", async () => {
      const uninitializedEncryptor = new Encryptor();

      await expect(uninitializedEncryptor.encrypt("test")).rejects.toThrow(
        "Encryptor not initialized",
      );
    });

    it("should throw error if decrypting without key", async () => {
      const uninitializedEncryptor = new Encryptor();
      const dummyData = new ArrayBuffer(32);
      const dummyIV = new Uint8Array(12);

      await expect(
        uninitializedEncryptor.decrypt(dummyData, dummyIV),
      ).rejects.toThrow("Encryptor not initialized");
    });

    it("should work with provided CryptoKey", async () => {
      const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );

      const encryptorWithKey = await Encryptor.new(key);
      const plaintext = "test-with-provided-key";

      const { encrypted, iv } = await encryptorWithKey.encrypt(plaintext);
      const decrypted = await encryptorWithKey.decrypt(
        encrypted,
        new Uint8Array(iv),
      );

      expect(decrypted).toBe(plaintext);
    });
  });

  describe("Edge Cases", () => {
    it("should handle long strings", async () => {
      const plaintext = "a".repeat(10000);

      const { encrypted, iv } = await encryptor.encrypt(plaintext);
      const decrypted = await encryptor.decrypt(encrypted, new Uint8Array(iv));

      expect(decrypted).toBe(plaintext);
    });

    it("should handle special characters", async () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';

      const { encrypted, iv } = await encryptor.encrypt(plaintext);
      const decrypted = await encryptor.decrypt(encrypted, new Uint8Array(iv));

      expect(decrypted).toBe(plaintext);
    });

    it("should handle newlines and tabs", async () => {
      const plaintext = "Line1\nLine2\tTabbed\r\nWindows";

      const { encrypted, iv } = await encryptor.encrypt(plaintext);
      const decrypted = await encryptor.decrypt(encrypted, new Uint8Array(iv));

      expect(decrypted).toBe(plaintext);
    });
    it("should return key", async () => {
      const key = encryptor.getKey();
  
      expect(key).not.toBeNull();
      expect(key?.type).toBe("secret");
    })
  });

});
