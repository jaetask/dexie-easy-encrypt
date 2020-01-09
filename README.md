# dexie-easy-encrypt

Easy, unopinionated, table encryption middleware for Dexie

[![npm version](https://badge.fury.io/js/dexie-easy-encrypt.svg)](https://badge.fury.io/js/dexie-easy-encrypt)


## Installation

```bash
$ npm i -S dexie-easy-encrypt
```

## Advantages
- Zero dependencies
- Encryptor dependency injected
- Hides all non index / primary-key fields in encrypted tables
- Provides on the fly encrypt/decrypt of Dexie table data

## Usage
Call the middleware before opening the db


```js
import encryption from './encryption' // see example below

const db = new Dexie('DatabaseName');
middleware({ db, encryption, tables: ['friends'] });
db.version(1).stores({
  friends: '++id, name, age',
});
db.open();
```


## Encryption example
You can use whatever encryption library you like. To do so, create a wrapper similar to this one which conforms to the required interface. The only important thing is that you pass in an object with `encrypt` and `decrypt` methods. How you choose to create a salt/password/object/library or whatever is completely up to you so that you can integrate with your already existing encryption methods.

```js
const sjcl = require('sjcl');

const password = 'PuttingPasswordsInCodeIsATerribleIdeaButThisIsADemo!DoNotDoThisAtHome!!!';

export const encryption = {
  encrypt: values => sjcl.encrypt(password, JSON.stringify(values)),
  decrypt: data => JSON.parse(sjcl.decrypt(password, data)),
};
```

Then pass the encryption into the middleware like so
```js
middleware({ db, encryption, tables });
````


## Test example
A full example is given in the unit tests in `index.test.js`

## Caveats
- For security, we remove any non index/primary-key fields from the passed object to be encrypted, this means that objects passed into table.add will be modified by the middleware, the middleware is not pure. please clone objects before passing to table.add.

## License

**[ISC](LICENSE)** Licensed

---

## Acknowledgement
This plugin is inspired by the awesome [dexie-encrypted](https://github.com/mark43/dexie-encrypted) plugin. 

We chose to go our own path because we wanted to use a different encryption method and did not want users to be able to view our object structure. We also had some issues integrating [dexie-encrypted](https://github.com/mark43/dexie-encrypted) with cypress, due to the reliance on `typeson` and `typeson-registry`. Cypress does work on its own, but not with our [sympress](https://github.com/jaetask/sympress) plugin.

However, if you require the additional features that [dexie-encrypted](https://github.com/mark43/dexie-encrypted) provides, such as whitelisting/blacklisting individual object fields per table, then we highly advise you to go that route.
