// Important! Do not change order of imports!
import 'fake-indexeddb/auto';
import 'dexie-export-import';
import { encryption } from './utils/example-encryption';
import { clearAllTables, clone, init } from './utils/tests';
import Dexie from 'dexie';
import middleware from './index';
import { ENCRYPTED_DATA_KEY, ERROR_DB_ALREADY_OPEN } from './utils/utils';

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
      friendsUnencrypted: '++id, name, age',
    });
    done();
  });
  beforeEach(async done => {
    await clearAllTables(db.write);
    done();
  });
  describe('Unencrypted tables', () => {
    it('Write and read object', async done => {
      await db.write.friendsUnencrypted.add(clone(camila));
      const data = await db.read.table('friendsUnencrypted').get({ name: camila.name });
      expect(data).not.toHaveProperty(ENCRYPTED_DATA_KEY);
      expect(data).toHaveProperty('age');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('picture');
      expect(data).toHaveProperty('street');
      expect(data.age).toEqual(camila.age);
      expect(data.name).toEqual(camila.name);
      expect(data.picture).toEqual(camila.picture);
      expect(data.street).toEqual(camila.street);
      done();
    });
  });
  describe('Encrypted tables', () => {
    describe('Stored raw values', () => {
      it('Write object keeps index keys', async done => {
        await db.write.friends.add(clone(camila));
        const data = await db.raw.table('friends').get({ name: camila.name });
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('age');
        done();
      });
      it('Write object hides non index keys', async done => {
        await db.write.friends.add(clone(camila));
        const data = await db.raw.table('friends').get({ name: camila.name });
        expect(data).not.toHaveProperty('street');
        expect(data).not.toHaveProperty('picture');
        done();
      });
      it('Write object has encrypted data', async done => {
        await db.write.friends.add(clone(camila));
        const data = await db.raw.table('friends').get({ name: camila.name });
        expect(data).toHaveProperty(ENCRYPTED_DATA_KEY);
        done();
      });
      it('Decrypted data matches what was stored', async done => {
        await db.write.friends.add(clone(camila));
        const data = await db.raw.table('friends').get({ name: camila.name });
        const decrypted = encryption.decrypt(data[ENCRYPTED_DATA_KEY]);
        expect(decrypted.age).toEqual(camila.age);
        expect(decrypted.name).toEqual(camila.name);
        expect(decrypted.picture).toEqual(camila.picture);
        expect(decrypted.street).toEqual(camila.street);
        done();
      });
    });
  });
});

describe('Fails', () => {
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
