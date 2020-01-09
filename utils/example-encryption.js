const sjcl = require('sjcl');

const password = 'PuttingPasswordsInCodeIsATerribleIdeaButThisIsADemo!DoNotDoThisAtHome!!!';

export const encryption = {
  encrypt: values => sjcl.encrypt(password, JSON.stringify(values)),
  decrypt: data => JSON.parse(sjcl.decrypt(password, data)),
};
