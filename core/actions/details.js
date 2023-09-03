const envVar = require('../env');
const session = require('../session');

module.exports =  async() => {
    console.log(`Current environment: ${envVar.env}`);
    console.log(`Session details:`);
    const sessionDetails = session.get();
    let info = [];
   if (sessionDetails){
    info =  [
        `User: ${sessionDetails.userInfo.fullname}`,
        `Email: ${sessionDetails.userInfo.email}`,
    ];
   }

   console.log(info.join('\n'));
}