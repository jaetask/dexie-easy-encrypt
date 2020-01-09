// Important! Do not change order of imports!
import 'fake-indexeddb/auto';
import 'dexie-export-import';
import { encryption } from './utils/example-encryption';
import { clearAllTables, init } from './utils/tests';
import Dexie from 'dexie';
import middleware from './index';
import { ERROR_DB_ALREADY_OPEN } from './utils';

describe('Middleware', () => {
  let db = null;
  const camila = {
    name: 'Camilla',
    age: 25,
    street: 'East 13th Street',
    picture: 'camilla.png',
  };
  beforeAll(async done => {
    db = await init('test-db', encryption, ['friends'], {
      friends: '++id, name, age',
    });
    done();
  });
  beforeEach(async done => {
    await clearAllTables(db.write);
    done();
  });
  it('Write and read object', async done => {
    await db.write.friends.add(camila);
    const data = await db.read.table('friends').get({ name: camila.name });
    expect(data).toMatchObject(camila);
    done();
  });
  it('Write object hides non index keys', async done => {
    await db.write.friends.add(camila);
    const data = await db.raw.table('friends').get({ name: camila.name });
    expect(data).not.toHaveProperty('street');
    expect(data).not.toHaveProperty('picture');
    done();
  });
});

describe.skip('Fails', () => {
  it('When adding middleware to open db', async () => {
    try {
      const db = new Dexie('open-then-add-middleware');
      db.version(1).stores({});
      await db.open();
      await middleware({ db, encryption });
    } catch (e) {
      expect(e.message).toMatch(ERROR_DB_ALREADY_OPEN);
    }
  });
});
