import Dexie from 'dexie';
import middleware from '../index';

/**
 * Initialise our tests with a common set of read/write and raw db connections
 * @param dbName
 * @param encryption
 * @param tables
 * @param schema
 * @returns {Promise<{read: Dexie, raw: Dexie, write: Dexie}>}
 */
export const init = async (dbName, encryption, tables, schema) => {
  // setup a write connection with middleware
  const write = new Dexie(dbName);
  await middleware({ db: write, encryption, tables });
  write.version(1).stores(schema);
  await write.open();

  // setup a read connection with middleware
  const read = new Dexie(dbName);
  await middleware({ db: read, encryption, tables });
  read.version(1).stores(schema);
  await read.open();

  // setup a read connection with no middleware
  const raw = new Dexie(dbName);
  raw.version(1).stores(schema);
  await raw.open();

  return {
    read,
    write,
    raw,
  };
};

/**
 * Clears all the tables, used to ensure each test has a clean slate to start with
 * @param db
 * @returns {Promise<[T1, T1, T1, T1, T1, T1, T1, T1, T1, T1]>}
 */
export const clearAllTables = async db =>
  Promise.all(
    db.tables.map(function(table) {
      return table.clear();
    })
  );

/**
 * Clone an object, used to stop test modifications bleeding into each other
 * @param obj
 * @returns {any}
 */
export const clone = obj => Object.assign({}, obj);
