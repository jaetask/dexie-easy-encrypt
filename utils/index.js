import Dexie from 'dexie';

export const ENCRYPTED_DATA_KEY = '__data__';
export const ENCRYPTION_SETTINGS_TABLE = '__EncryptionSettings__';
export const ERROR_DB_ALREADY_OPEN = 'The middleware cannot be installed on an open database';
export const ERROR_ENCRYPTION_TABLE_NOT_FOUND =
  "Can't find its encryption table. You may need to bump your database version";

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
export const getEncryptionSettingsTable = db => {
  try {
    return db.table(ENCRYPTION_SETTINGS_TABLE);
  } catch (error) {
    throw new Error(makeError(ERROR_ENCRYPTION_TABLE_NOT_FOUND));
  }
};
