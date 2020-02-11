import * as constants from '../constants';
import { encryptObject } from './encrypt-object';
import { decryptObject } from './decrypt-object';

/**
 * Sets up the table hooks for a table that will be encrypted
 * @param table
 * @param encryption
 */
export const setupHooks = (table, encryption) => {
  console.log('Installing hooks for', table.name);
  table.hook('creating', (primKey, obj) => {
    encryptObject(table, obj, encryption);
  });

  table.hook('updating', (modifications, primKey, obj) => {
    // do we have any modifications?
    const modificationKeys = Object.keys(modifications).filter(x => x !== constants.ENCRYPTED_DATA_KEY);
    if (modificationKeys.length === 0) {
      return undefined;
    }

    // decrypt the original object
    const decrypted = decryptObject({ ...obj }, encryption);

    // merge the modifications into the original object
    const updates = {
      ...decrypted,
      ...modifications,
    };

    // encrypt the new object (must not modify passed params)
    // wipe keys to undefined instead of deleting from object, which dexie uses to
    // remove them from the modifications object

    encryptObject(table, updates, encryption, true);

    return updates;
  });
  table.hook('reading', obj => decryptObject(obj, encryption));
};
