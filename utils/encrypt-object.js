import * as constants from '../constants';

/**
 * Handles the transformation of the passed entity into what will actually be stored in the db
 *
 * Wipe Keys:
 * =========
 * To clean an object (remove its non encrypted (non index/primary-key) fields), we need to use two different
 * methods depending on writing to the db, or modifying an object.
 *
 * - When writing (false), we nullify the key and delete it
 * - When updating (true) we must set its value to undefined and the Dexie process will remove the key
 *
 * @param table
 * @param entity
 * @param encryption
 * @param wipeKeys
 */
export const encryptObject = (table, entity, encryption, wipeKeys = false) => {
  const toStore = Object.assign({}, entity);

  const indices = table.schema.indexes.map(index => index.name);
  Object.keys(entity).forEach(key => {
    if (key === table.schema.primKey.name || indices.includes(key)) {
      return;
    }
    // creating an object in db
    if (wipeKeys === false) {
      entity[key] = null;
      delete entity[key];
    }
    // updating the object in db
    if (wipeKeys === true) {
      entity[key] = undefined;
    }
  });

  entity[constants.ENCRYPTED_DATA_KEY] = encryption.encrypt(toStore);
};
