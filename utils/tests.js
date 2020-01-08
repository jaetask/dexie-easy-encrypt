import Dexie from 'dexie';
import middleware from '../index';

export const init = async (dbName, encryption, tables, schema) => {
  // setup a write connection with middleware
  const write = new Dexie(dbName);
  await middleware(write, encryption, tables);
  write.version(1).stores(schema);
  await write.open();

  // setup a read connection with middleware
  const read = new Dexie(dbName);
  await middleware(read, encryption, tables);
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

export function clearAllTables(db) {
  return Promise.all(
    db.tables.map(function(table) {
      return table.clear();
    })
  );
}
