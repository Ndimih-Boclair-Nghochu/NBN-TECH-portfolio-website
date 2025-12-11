const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TeamMember = sequelize.define('TeamMember', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING },
    bio: { type: DataTypes.TEXT },
    photo: { type: DataTypes.STRING },
    linkedin: { type: DataTypes.STRING },
    website: { type: DataTypes.STRING }
  }, {
    timestamps: true
  });
  return TeamMember;
};
