import { randomUUID, randomFillSync, webcrypto } from 'crypto';

const globalWithCrypto = globalThis as typeof globalThis & {
  crypto?: Crypto;
};

if (!globalWithCrypto.crypto) {
  const fallbackCrypto: Crypto = {
    randomUUID,
    getRandomValues: <T extends ArrayBufferView>(array: T): T => {
      randomFillSync(array as unknown as NodeJS.ArrayBufferView);
      return array;
    },
    subtle: {} as SubtleCrypto,
  };

  globalWithCrypto.crypto = (webcrypto ?? fallbackCrypto) as Crypto;
}
