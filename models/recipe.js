// Recipe model definition
const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const Recipe = sequelize.define(
  'Recipe',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    ingredients: {
      type: DataTypes.TEXT, // JSON or text list of ingredients
    },
    steps: {
      type: DataTypes.TEXT,
    },
    imageUrl: {
      type: DataTypes.STRING,
    },
    author: {
      type: DataTypes.STRING,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'recipes',
    timestamps: false, // we’re manually handling createdAt
  }
);

module.exports = Recipe;
