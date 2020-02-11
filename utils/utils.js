import * as constants from '../constants';
import Dexie from 'dexie';

export const makeError = err => `dexie-easy-encrypt: ${err}`;

export const overrideParseStoresSpec = db => {
  db.Version.prototype._parseStoresSpec = Dexie.override(
    db.Version.prototype._parseStoresSpec,
    func =>
      function(stores, dbSchema) {
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
export const getEncryptionSettingsTable = db => {
  try {
    return db.table(constants.ENCRYPTION_SETTINGS_TABLE);
  } catch (error) {
    throw new Error(makeError(constants.ERROR_ENCRYPTION_TABLE_NOT_FOUND));
  }
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
