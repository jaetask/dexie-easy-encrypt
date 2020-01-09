import Dexie from 'dexie';

export const ENCRYPTED_DATA_KEY = '__data__';
export const ENCRYPTION_SETTINGS_TABLE = '__EncryptionSettings__';
export const ERROR_DB_ALREADY_OPEN = 'The middleware cannot be installed on an open database';
export const ERROR_ENCRYPTION_TABLE_NOT_FOUND =
  "Can't find its encryption table. You may need to bump your database version";

export const SCENARIO_1 = "Table was not previously encrypted and still isn't";
export const SCENARIO_2 = 'Table was not previously encrypted but now is';
export const SCENARIO_3 = 'Table was previously encrypted but now is not';
export const SCENARIO_4 = 'Table was previously encrypted and still is';
export const SCENARIO_5 = 'Table is encryption settings table';

export const makeError = err => `dexie-easy-encrypt: ${err}`;

export const overrideParseStoresSpec = db => {
  db.Version.prototype._parseStoresSpec = Dexie.override(
    db.Version.prototype._parseStoresSpec,
    func => (stores, dbSchema) => {
      stores[ENCRYPTION_SETTINGS_TABLE] = '++id';
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
      throw new Error(makeError(ERROR_DB_ALREADY_OPEN));
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
    return db.table(ENCRYPTION_SETTINGS_TABLE);
  } catch (error) {
    throw new Error(makeError(ERROR_ENCRYPTION_TABLE_NOT_FOUND));
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
    const modificationKeys = Object.keys(modifications).filter(x => x !== ENCRYPTED_DATA_KEY);
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
 * Tables have multiple possible scenarios, this function decides on the correct course of action
 *
 * test driven.
 *
 * Scenario 1
 * ==========
 * Table was not previously encrypted and still isn't
 * - do nothing
 *
 * Scenario 2
 * ==========
 * Table was not previously encrypted but now is
 * - install hooks
 * - update any existing records encrypting them as we go
 *
 * Scenario 3
 * ==========
 * Table was previously encrypted but now is not
 * - update any existing records decrypting them as we go
 *
 * Scenario 4
 * ==========
 * Table was previously encrypted and still is
 * - install hooks
 *
 * @param table
 * @param tables
 * @param previousTables
 * @returns string|null
 */
export const selectTableScenario = (table, tables, previousTables) => {
  if (table.name === ENCRYPTION_SETTINGS_TABLE) {
    return SCENARIO_5;
  }
  if (!previousTables.includes(table.name) && !tables.includes(table.name)) {
    return SCENARIO_1;
  }
  if (!previousTables.includes(table.name) && tables.includes(table.name)) {
    return SCENARIO_2;
  }
  if (previousTables.includes(table.name) && !tables.includes(table.name)) {
    return SCENARIO_3;
  }
  if (previousTables.includes(table.name) && tables.includes(table.name)) {
    return SCENARIO_4;
  }

  return null;
};

/**
 * Handles the transformation of the passed entity into what will actually be stored in the db
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

    if (wipeKeys === true) {
      entity[key] = undefined;
    } else {
      entity[key] = null;
      delete entity[key];
    }
  });

  entity[ENCRYPTED_DATA_KEY] = encryption.encrypt(toStore);
};

/**
 * Handles the transformation of the db stored value back into the decrypted entity
 * @param entity
 * @param encryption
 * @param wipeKeys
 * @returns {Promise<*>|PromiseLike<ArrayBuffer>|*}
 */
export function decryptObject(entity, encryption, wipeKeys = false) {
  console.log('Decrypting object', entity);
  if (entity && entity[ENCRYPTED_DATA_KEY]) {
    const result = encryption.decrypt(entity[ENCRYPTED_DATA_KEY]);
    if (wipeKeys === true) {
      result[ENCRYPTED_DATA_KEY] = undefined;
    } else {
      result[ENCRYPTED_DATA_KEY] = null;
      delete result[ENCRYPTED_DATA_KEY];
    }
    return result;
  }
  return entity;
}
