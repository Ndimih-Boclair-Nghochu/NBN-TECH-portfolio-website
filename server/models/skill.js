const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Skill = sequelize.define('Skill', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    level: { type: DataTypes.STRING },
    order: { type: DataTypes.INTEGER, defaultValue: 0 }
  }, {
    timestamps: true
  });
  return Skill;
};
