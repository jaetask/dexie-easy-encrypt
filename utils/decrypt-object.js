import * as constants from '../constants';

/**
 * Handles the transformation of the db stored value back into the decrypted entity
 * @param entity
 * @param encryption
 * @param wipeKeys
 * @returns {Promise<*>|PromiseLike<ArrayBuffer>|*}
 */
export function decryptObject(entity, encryption, wipeKeys = false) {
  if (entity && entity[constants.ENCRYPTED_DATA_KEY]) {
    const result = encryption.decrypt(entity[constants.ENCRYPTED_DATA_KEY]);
    if (wipeKeys === true) {
      result[constants.ENCRYPTED_DATA_KEY] = undefined;
    } else {
      result[constants.ENCRYPTED_DATA_KEY] = null;
      delete result[constants.ENCRYPTED_DATA_KEY];
    }
    return result;
  }
  return entity;
}
