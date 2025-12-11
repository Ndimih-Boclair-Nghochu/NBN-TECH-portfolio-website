const { Sequelize } = require('sequelize');
const path = require('path');
const env = process.env.NODE_ENV || 'development';

let sequelize;

if (process.env.DATABASE_URL) {
  // production (Postgres)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
  });
} else {
  // development: sqlite
  const storage = path.join(__dirname, '..', 'data', 'dev.sqlite');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: false,
  });
}

const db = {};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// import models
db.Project = require('./project')(sequelize);
db.User = require('./user')(sequelize);
db.Project = require('./project')(sequelize);
db.Blog = require('./blog')(sequelize);
db.Review = require('./review')(sequelize);
db.Service = require('./service')(sequelize);
db.Skill = require('./skill')(sequelize);
db.TeamMember = require('./teamMember')(sequelize);
db.Contact = require('./contact')(sequelize);

// relations if any

module.exports = db;
