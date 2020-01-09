# dexie-easy-encrypt

Easy encryption middleware for dexie

[![npm version](https://badge.fury.io/js/dexie-easy-encrypt.svg)](https://badge.fury.io/js/dexie-easy-encrypt)

![ADD ALT TEXT FOR IMAGE HERE](https://user-images.githubusercontent.com/887639/51285828-54e0a580-19be-11e9-8ac8-48153753e445.png)


[Easy, unopinionated table encryption for Dexie]

## Installation

```bash
$ npm i dexie-easy-encrypt
```

or

```bash
$ yarn add dexie-easy-encrypt
```

## Usage

[describe a simple use of the thingie that you are pitching. keep it short]

```js
const thingie = createThingie(config);
```

### Parameters

[describe what parameters your package/function takes]

| Parameter | Description                                |
| :-------- | :----------------------------------------- |
| `foo`     | A foo thingie (boolean). Default = `true`. |
| `bar`     | A bar thingie (string). Default = `bar`.   |

### Return

[describe what is returned]

| Key    | Description                                     |
| :----- | :---------------------------------------------- |
| `blah` | A boolean containing the current value of blah. |

## Example

[Write something here describing the sample code below. The example code SHOULD WORK!]

```jsx
import React from 'react';
import { createThingie } from 'dexie-easy-encrypt';

const Thingie = createThingie();

const MyThingie = () => {
  // Do some stuff

  return <Thingie>Return some JSX</Thingie>;
};

export default MyThingie;
```

## Caveats
- For security, we remove any non index/primary-key fields from the passed object to be encrypted, this means that objects passed into table.add will be modified by the middleware, the middleware is not pure. please clone objects before passing to table.add.

## License

**[ISC](LICENSE)** Licensed

---

[Optional footer information here. Maybe thank a friend. Maybe plug your Twitter account. Whatever.]
