const db = require('./models');
(async ()=>{
  await db.sequelize.authenticate();
  const u = await db.User.findOne();
  if(!u){ console.error('no user'); process.exit(1); }
  u.email = 'nbntechteam@gmail.com';
  await u.save();
  console.log('Updated user email to', u.email);
  process.exit(0);
})();
