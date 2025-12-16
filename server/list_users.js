const db = require('./models');
(async ()=>{
  await db.sequelize.authenticate();
  const users = await db.User.findAll();
  console.log('Users:', users.map(u=>({id:u.id,email:u.email,name:u.name}))); 
  process.exit(0);
})();
