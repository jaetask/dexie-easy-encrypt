import Dexie, { Promise } from 'dexie';
import {
  overrideParseStoresSpec,
  isDatabaseAlreadyOpen,
  getEncryptionSettingsTable,
} from './utils';

/**
 * Middleware to encrypt dexie tables
 * @param db
 * @param encryption
 * @param tables []
 * @param schema {}
 * @returns {Promise<void>}
 */
const middleware = async (db, encryption = null, tables, schema) => {
  overrideParseStoresSpec(db);
  await isDatabaseAlreadyOpen(db);
  db.on('ready', async () => {
    console.log('DB READY.. MIDDLEWARE INSTALLED');
    const settings = await getEncryptionSettingsTable(db);
  });
};

export default middleware;
