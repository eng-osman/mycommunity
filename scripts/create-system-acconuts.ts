#!ts-node
import axios from 'axios';
// tslint:disable: no-console
async function main(args: string[]) {
  const n = parseInt(args[2]) || 1;
  const createUser = (mob: string, i: number = 1) => ({
    requestId: 'dGVzdEFjY291bnQtcmVxdWVzdElkCg==',
    photoId: '4529', // Unknown Boy
    mobileNumber: mob,
    user: { email: `${mob}@klliq.com` },
    profile: {
      firstName: 'Test',
      lastName: `Channel ${i}`,
      nickName: `Test Channel ${i}`,
      language: 'en',
      location: '0,0',
      country: 'Egypt',
      countryCode: 'EG',
      countryDialCode: '+20',
      gender: 'male',
      birthdate: '2000-01-01',
      description: 'My New Channels',
      education: 'Youtuber',
      jobTitle: 'Youtuber',
      facebookLink: 'fb.com',
    },
  });

  const getRandom = (len: number) =>
    Math.random()
      .toString(10)
      .substring(len, len * 2);
  const server = 'localhost:3000';
  const endpoint = `http://${server}/api/v1/user/create`;
  for (let i = 0; i < n; i++) {
    const mob = '20801802803' + getRandom(3);
    const user = createUser(mob, parseInt(getRandom(5)));
    const res = await axios.post(endpoint, user);
    console.log(res.data);
  }
}

main(process.argv)
  .then(() => console.log('Done'))
  .catch(console.error);
