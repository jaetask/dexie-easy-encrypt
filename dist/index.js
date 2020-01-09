'use strict';

function _interopDefault(ex) {
  return ex && typeof ex === 'object' && 'default' in ex ? ex['default'] : ex;
}

var Dexie = _interopDefault(require('dexie'));

const ENCRYPTED_DATA_KEY = '__DATA__';
const ENCRYPTION_SETTINGS_TABLE = '__ENCRYPTION_SETTINGS__';
const ERROR_DB_ALREADY_OPEN = 'The middleware cannot be installed on an open database';
const ERROR_ENCRYPTION_TABLE_NOT_FOUND = "Can't find encryption table. You may need to bump the db version";
const SCENARIO_TABLE_ENCRYPTED_CHANGE = 'Table was previously encrypted but now is not';
const SCENARIO_TABLE_ENCRYPTED_NO_CHANGE = 'Table was previously encrypted and still is';
const SCENARIO_TABLE_IS_SETTINGS_TABLE = 'Table is encryption settings table';
const SCENARIO_TABLE_UNENCRYPTED_CHANGE = 'Table was previously not encrypted but now is';
const SCENARIO_TABLE_UNENCRYPTED_NO_CHANGE = "Table was previously not encrypted and still isn't";

const makeError = err => `dexie-easy-encrypt: ${err}`;

const overrideParseStoresSpec = db => {
  db.Version.prototype._parseStoresSpec = Dexie.override(
    db.Version.prototype._parseStoresSpec,
    func => (stores, dbSchema) => {
      stores[ENCRYPTION_SETTINGS_TABLE] = '++id';
      func.call(undefined, stores, dbSchema);
    }
  );
};

/**
 * Quick check to see if the db is already open
 * @param db
 * @returns {Dexie.Version}
 * @throws ERROR_DB_ALREADY_OPEN
 */
const isDatabaseAlreadyOpen = db => {
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
const getEncryptionSettingsTable = async db => {
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
const setupHooks = async (table, encryption) => {
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
const selectTableScenario = (table, tables, previousTables) => {
  if (table.name === ENCRYPTION_SETTINGS_TABLE) {
    return SCENARIO_TABLE_IS_SETTINGS_TABLE;
  }
  if (!previousTables.includes(table.name) && !tables.includes(table.name)) {
    return SCENARIO_TABLE_UNENCRYPTED_NO_CHANGE;
  }
  if (!previousTables.includes(table.name) && tables.includes(table.name)) {
    return SCENARIO_TABLE_UNENCRYPTED_CHANGE;
  }
  if (previousTables.includes(table.name) && !tables.includes(table.name)) {
    return SCENARIO_TABLE_ENCRYPTED_CHANGE;
  }
  if (previousTables.includes(table.name) && tables.includes(table.name)) {
    return SCENARIO_TABLE_ENCRYPTED_NO_CHANGE;
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
const encryptObject = async (table, entity, encryption, wipeKeys = false) => {
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

  entity[ENCRYPTED_DATA_KEY] = encryption.encrypt(toStore);
};

/**
 * Handles the transformation of the db stored value back into the decrypted entity
 * @param entity
 * @param encryption
 * @param wipeKeys
 * @returns {Promise<*>|PromiseLike<ArrayBuffer>|*}
 */
function decryptObject(entity, encryption, wipeKeys = false) {
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

const Promise = Dexie.Promise;

/**
 * Middleware to encrypt dexie tables
 * @param db
 * @param encryption
 * @param tables []
 * @returns {Promise<void>}
 */
const middleware = async ({ db, encryption = null, tables = [] }) => {
  overrideParseStoresSpec(db);
  await isDatabaseAlreadyOpen(db);

  db.on('ready', async () => {
    return Promise.resolve().then(async () => {
      const settingsTable = await getEncryptionSettingsTable(db);
      settingsTable
        .toCollection()
        .last()
        .then(previousSettings => {
          const previousTables =
            previousSettings && Array.isArray(previousSettings.tables) ? previousSettings.tables : [];

          Promise.resolve().then(() =>
            Promise.all(
              db.tables.map(table => {
                const scenario = selectTableScenario(table, tables, previousTables);
                switch (scenario) {
                  case SCENARIO_TABLE_UNENCRYPTED_CHANGE: {
                    return table
                      .toCollection()
                      .modify(function(entity, ref) {
                        ref.value = encryptObject(table, entity, encryption);
                        return true;
                      })
                      .then(() => setupHooks(table, encryption));
                  }
                  case SCENARIO_TABLE_ENCRYPTED_CHANGE: {
                    return table.toCollection().modify(function(entity, ref) {
                      ref.value = decryptObject(table, entity, encryption);
                      return true;
                    });
                  }
                  case SCENARIO_TABLE_ENCRYPTED_NO_CHANGE: {
                    setupHooks(table, encryption);
                    break;
                  }
                }
                return Promise.resolve();
              })
            )
          );
        })
        .then(() => settingsTable.clear())
        .then(() => settingsTable.put({ tables }))
        .catch(error => {
          if (error.name === 'NotFoundError') {
            throw new Error(makeError(ERROR_ENCRYPTION_TABLE_NOT_FOUND));
          }
          return Promise.reject(error);
        });
    });
  });
};

module.exports = middleware;
