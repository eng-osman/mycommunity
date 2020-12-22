/*
 *--------------------------------------------------------------
 *  Copyright 2018 (c) Shady Khalifa (@shekohex).
 *  All rights reserved.
 *-------------------------------------------------------------
 */
const PrettyError = require('pretty-error');
const pe = new PrettyError();
// require('longjohn');
process.on('unhandledRejection', function(reason) {
  console.log('Unhandled rejection');
  console.log(pe.render(reason));
});
require('ts-node/register');
require('tsconfig-paths/register');
require('./src/main');
