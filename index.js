import Dexie from 'dexie';
import {
  overrideParseStoresSpec,
  isDatabaseAlreadyOpen,
  getEncryptionSettingsTable,
  ENCRYPTION_SETTINGS_TABLE,
  setupHooks,
  makeError,
  ERROR_ENCRYPTION_TABLE_NOT_FOUND,
} from './utils';

const Promise = Dexie.Promise;

/**
 * Middleware to encrypt dexie tables
 * @param db
 * @param encryption
 * @param tables []
 * @param schema
 * @returns {Promise<void>}
 */
const middleware = async ({ db, encryption = null, tables = [], schema = null }) => {
  overrideParseStoresSpec(db);
  await isDatabaseAlreadyOpen(db);

  console.log('tables', tables);
  db.on('ready', async () => {
    return Promise.resolve().then(async () => {
      const settingsTable = await getEncryptionSettingsTable(db);
      settingsTable
        .toCollection()
        .last()
        .then(oldSettings => {
          console.log('oldSettings', oldSettings);
          // loop through the tables, checking if any are added or removed..
          Promise.resolve().then(() => {
            return Promise.all(
              db.tables.map(table => {
                // ignore our encryption settings table
                if (table.name === ENCRYPTION_SETTINGS_TABLE) {
                  return Promise.resolve();
                }
                // if we should be encrypting
                if (tables.includes(table.name)) {
                  setupHooks(table);
                  return Promise.resolve();
                }
              })
            );
          });
        })
        .then(() => settingsTable.clear())
        .then(() =>
          settingsTable.put({
            tables,
          })
        )
        .catch(error => {
          if (error.name === 'NotFoundError') {
            throw new Error(makeError(ERROR_ENCRYPTION_TABLE_NOT_FOUND));
          } else {
            return Promise.reject(error);
          }
        });
    });
  });
};

export default middleware;
