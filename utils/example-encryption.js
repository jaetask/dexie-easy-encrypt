const sjcl = require('sjcl');

const password = 'PuttingPasswordsInCodeIsATerribleIdeaButThisIsADemo!DoNotDoThisAtHome!!!';

export const encryption = {
  encrypt: values => {
    return sjcl.encrypt(password, JSON.stringify(values));
  },
  decrypt: data => {
    return JSON.parse(sjcl.decrypt(password, data));
  },
};
