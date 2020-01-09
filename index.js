import Dexie from 'dexie';
import {
  overrideParseStoresSpec,
  isDatabaseAlreadyOpen,
  getEncryptionSettingsTable,
  ENCRYPTION_SETTINGS_TABLE,
  setupHooks,
  makeError,
  ERROR_ENCRYPTION_TABLE_NOT_FOUND,
  selectTableScenario,
  SCENARIO_1,
  SCENARIO_2,
  SCENARIO_3,
  SCENARIO_4,
  encryptObject,
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
        .then(previousSettings => {
          const previousTables =
            previousSettings && Array.isArray(previousSettings.tables)
              ? previousSettings.tables
              : [];

          Promise.resolve().then(() =>
            Promise.all(
              db.tables.map(table => {
                const scenario = selectTableScenario(table, tables, previousTables);

                console.log('scenario', scenario);
                switch (scenario) {
                  case SCENARIO_2: {
                    return table
                      .toCollection()
                      .modify(function(entity, ref) {
                        ref.value = encryptObject(table, entity, encryption.encrypt(entity));
                        return true;
                      })
                      .then(() => setupHooks(table));
                  }
                  case SCENARIO_3: {
                    // decrypt current data..
                    break;
                  }
                  case SCENARIO_4: {
                    setupHooks(table);
                    break;
                  }
                }
                return Promise.resolve();
              })
            )
          );
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
