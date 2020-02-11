import * as constants from './constants';
import Dexie from 'dexie';
import {
  getEncryptionSettingsTable,
  isDatabaseAlreadyOpen,
  makeError,
  overrideParseStoresSpec,
  selectTableScenario,
} from './utils/utils';
import { encryptObject } from 'dexie-easy-encrypt/utils/encrypt-object';
import { decryptObject } from 'dexie-easy-encrypt/utils/decrypt-object';

const Promise = Dexie.Promise;

/**
 * Middleware to encrypt dexie tables
 * @param db
 * @param encryption
 * @param tables []
 */
const middleware = ({ db, encryption = null, tables = [] }) => {
  db.easyEncryptReady = false;
  overrideParseStoresSpec(db);
  isDatabaseAlreadyOpen(db);

  db.on('ready', function() {
    console.log('passed into db.on.ready');
    const settingsTable = getEncryptionSettingsTable(db);
    console.log('settingsTable', settingsTable);
    return Promise.resolve()
      .then(() => {
        settingsTable
          .toCollection()
          .last()
          .then(previousSettings => {
            const previousTables =
              previousSettings && Array.isArray(previousSettings.tables) ? previousSettings.tables : [];

            return Promise.resolve().then(() =>
              Promise.all(
                db.tables.map(function(table) {
                  function setupHooks(table, encryption) {
                    console.log('table', table);
                    table.hook('creating', (primKey, obj) => {
                      encryptObject(table, obj, encryption);
                    });
                    table.hook('updating', (modifications, primKey, obj) => {
                      // do we have any modifications?
                      const modificationKeys = Object.keys(modifications).filter(
                        x => x !== constants.ENCRYPTED_DATA_KEY
                      );
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
                    table.hook('reading', obj => {
                      decryptObject(obj, encryption);
                    });
                    console.log('hooks installed for', table.name);
                  }

                  const scenario = selectTableScenario(table, tables, previousTables);
                  switch (scenario) {
                    case constants.SCENARIO_TABLE_UNENCRYPTED_CHANGE: {
                      setupHooks(table, encryption);
                      return;
                    }
                    case constants.SCENARIO_TABLE_ENCRYPTED_NO_CHANGE: {
                      setupHooks(table, encryption);
                      return;
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
      })
      .then(() => {
        db.easyEncryptReady = true;
      });
  });
};

export default middleware;
