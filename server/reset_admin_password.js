require('dotenv').config();
const db = require('./models');
const bcrypt = require('bcrypt');

async function setPassword(){
  await db.sequelize.authenticate();
  const email = process.env.ADMIN_EMAIL || 'nbntechteam@gmail.com';
  const pw = process.env.ADMIN_PASSWORD || '@Boclair444';
  const User = db.User;
  let u = await User.findOne({ where: { email } });
  if(!u){
    // fallback: pick the first user
    u = await User.findOne();
    if(!u){ console.error('No users in DB'); process.exit(1); }
    console.log('Using first user:', u.email);
  }
  const hash = await bcrypt.hash(pw, 10);
  u.passwordHash = hash;
  await u.save();
  console.log('Updated admin password for', email);
  process.exit(0);
}

setPassword().catch(e => { console.error(e); process.exit(1); });
