import * as constants from '../constants';
import Dexie from 'dexie';

export const makeError = err => `dexie-easy-encrypt: ${err}`;

export const overrideParseStoresSpec = db => {
  db.Version.prototype._parseStoresSpec = Dexie.override(
    db.Version.prototype._parseStoresSpec,
    func => (stores, dbSchema) => {
      stores[constants.ENCRYPTION_SETTINGS_TABLE] = '++id';
      func.call(this, stores, dbSchema);
    }
  );
};

/**
 * Quick check to see if the db is already open
 * @param db
 * @returns {Dexie.Version}
 * @throws ERROR_DB_ALREADY_OPEN
 */
export const isDatabaseAlreadyOpen = db => {
  if (db.verno > 0) {
    // Make sure new tables are added if calling encrypt after defining versions.
    try {
      return db.version(db.verno).stores({});
    } catch (error) {
      throw new Error(makeError(constants.ERROR_DB_ALREADY_OPEN));
    }
  }
};

/**
 * Get the encryption settings table
 * @param db
 * @returns {void | Dexie.Table<any, any>}
 * @throws ERROR_ENCRYPTION_TABLE_NOT_FOUND
 */
export const getEncryptionSettingsTable = async db => {
  try {
    return db.table(constants.ENCRYPTION_SETTINGS_TABLE);
  } catch (error) {
    throw new Error(makeError(constants.ERROR_ENCRYPTION_TABLE_NOT_FOUND));
  }
};

/**
 * Sets up the table hooks for a table that will be encrypted
 * @param table
 * @param encryption
 */
export const setupHooks = async (table, encryption) => {
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

/**
 * Tables have multiple possible scenarios, this function decides on which one is relevant
 *
 * SCENARIO_TABLE_UNENCRYPTED_NO_CHANGE
 * ====================================
 * Table was not previously encrypted and still isn't
 *
 * SCENARIO_TABLE_UNENCRYPTED_CHANGE
 * ==========
 * Table was previously not encrypted but now is
 *
 * SCENARIO_TABLE_UNENCRYPTED_CHANGE
 * ==========
 * Table was previously encrypted but now is not
 *
 * SCENARIO_TABLE_ENCRYPTED_NO_CHANGE
 * ==========
 * Table was previously encrypted and still is
 *
 * @param table
 * @param tables
 * @param previousTables
 * @returns string|null
 */
export const selectTableScenario = (table, tables, previousTables) => {
  if (table.name === constants.ENCRYPTION_SETTINGS_TABLE) {
    return constants.SCENARIO_TABLE_IS_SETTINGS_TABLE;
  }
  if (!previousTables.includes(table.name) && !tables.includes(table.name)) {
    return constants.SCENARIO_TABLE_UNENCRYPTED_NO_CHANGE;
  }
  if (!previousTables.includes(table.name) && tables.includes(table.name)) {
    return constants.SCENARIO_TABLE_UNENCRYPTED_CHANGE;
  }
  if (previousTables.includes(table.name) && !tables.includes(table.name)) {
    return constants.SCENARIO_TABLE_ENCRYPTED_CHANGE;
  }
  if (previousTables.includes(table.name) && tables.includes(table.name)) {
    return constants.SCENARIO_TABLE_ENCRYPTED_NO_CHANGE;
  }
  return null;
};

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
export const encryptObject = async (table, entity, encryption, wipeKeys = false) => {
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
