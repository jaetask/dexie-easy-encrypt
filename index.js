import * as constants from './constants';
import Dexie from 'dexie';
import {
  decryptObject,
  encryptObject,
  getEncryptionSettingsTable,
  isDatabaseAlreadyOpen,
  makeError,
  overrideParseStoresSpec,
  selectTableScenario,
  setupHooks,
} from './utils/utils';

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
                  case constants.SCENARIO_TABLE_UNENCRYPTED_CHANGE: {
                    return table
                      .toCollection()
                      .modify(function(entity, ref) {
                        ref.value = encryptObject(table, entity, encryption);
                        return true;
                      })
                      .then(() => setupHooks(table, encryption));
                  }
                  case constants.SCENARIO_TABLE_ENCRYPTED_CHANGE: {
                    return table.toCollection().modify(function(entity, ref) {
                      ref.value = decryptObject(table, entity, encryption);
                      return true;
                    });
                  }
                  case constants.SCENARIO_TABLE_ENCRYPTED_NO_CHANGE: {
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
            throw new Error(makeError(constants.ERROR_ENCRYPTION_TABLE_NOT_FOUND));
          }
          return Promise.reject(error);
        });
    });
  });
};

export default middleware;
