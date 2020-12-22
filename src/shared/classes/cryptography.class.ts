// import * as bcrypt from 'bcrypt';
// const SALT_WORK_FACTOR = 12;
// // A Mess !
// export class Cryptography {
//   /**
//    * Given a string, resolves to the string's hashed value.
//    */
//   public hash(str: string): Promise<string> {
//     return new Promise((resolve, reject) => {
//       // generate random salt
//       bcrypt.genSalt(SALT_WORK_FACTOR, (err, salt) => {
//         if (err) {
//           // Logger.error('Cryptography', err);
//           return reject(err);
//         }
//         // salt is ready, generate the hash
//         bcrypt.hash(str, salt, (err, hash) => {
//           if (err) {
//             // Logger.error('Cryptography', err);
//             return reject(err);
//           }
//           // Hash is ready, resolve the promise
//           return resolve(hash);
//         });
//       });
//     });
//   }

//   /**
//    * Given a string and a bcrypt hash, resolves if value matches the given hash
//    */
//   public checkHash(value: string, hash: string): Promise<boolean> {
//     return new Promise((resolve, reject) => {
//       bcrypt.compare(value, hash, (err, result) => {
//         if (err) {
//           // Logger.error('Cryptography', err);
//           return reject(err);
//         }
//         // if the result is available, resolve the promise, otherwise reject
//         if (result) {
//           // Logger.debug('Debug', result);
//           resolve(result);
//         } else {
//           // Logger.debug('Crypto Hash Checking', 'I Think There is error here');
//           // Logger.debug('HashChecking', 'Oh no i think the user failed to auth');
//           reject(false);
//         }
//       });
//     });
//   }
// }
