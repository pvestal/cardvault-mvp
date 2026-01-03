/**
 * Crypto service mocking utilities
 */

export class MockCryptoService {
  encrypt = jest.fn().mockImplementation((data: string) => {
    return `encrypted_${data}`;
  });

  decrypt = jest.fn().mockImplementation((encryptedData: string) => {
    return encryptedData.replace('encrypted_', '');
  });

  clearMocks() {
    this.encrypt.mockClear();
    this.decrypt.mockClear();
  }
}

/**
 * Create a mock CryptoService instance
 */
export const createMockCrypto = (): MockCryptoService => {
  return new MockCryptoService();
};