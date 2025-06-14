require("dotenv").config();
const mongoose = require("mongoose");
const { uuid } = require('uuidv4');
var bcrypt = require('bcrypt-nodejs')
const User = require("../models/user");
const Tools = require('../services/Tools/Tools')

mongoose.connect(process.env.MONGODB_URI, {
  useFindAndModify: false,
  retryWrites: false,
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

function hashPassword(password) {
  let salt = bcrypt.genSaltSync()
  let hash = bcrypt.hashSync(password, salt)
  return hash
}

const characters = [
{
  email: 'gob@imaginecouncil.com',
  username: 'Gob Arcade',
  favouriteColor: 'Red',
  hub: 'CGI',
  nodeID: 'https://ic-characters.s3.amazonaws.com/Gob+Arcade.png',
  creative: 'Voice',
  role: 'character',
}, 
{
  email: 'orb@imaginecouncil.com',
  username: 'Orb Puter',
  favouriteColor: 'Blue',
  hub: 'CGI',
  nodeID: 'https://ic-characters.s3.amazonaws.com/Orb+Puter.png',
  creative: 'Visual',
  role: 'character',
}, 
{
  email: 'default@imaginecouncil.com',
  username: 'Kawaii',
  favouriteColor: 'Orange',
  hub: 'Anime',
  nodeID: 'https://ic-characters.s3.amazonaws.com/Story.png',
  creative: 'Word',
  role: 'character',
}, 
{
  email: 'default+bisney@imaginecouncil.com',
  username: 'Bisney Helix',
  favouriteColor: 'Black',
  hub: 'Superhero',
  nodeID: 'https://ic-characters.s3.amazonaws.com/bisney_profile_symbol.png',
  creative: 'Sound',
  role: 'character',
}, 
{
  email: 'default+sunny@imaginecouncil.com',
  username: 'Sunny',
  favouriteColor: 'Orange',
  hub: 'Puppet',
  nodeID: 'https://ic-characters.s3.amazonaws.com/Sunny.png',
  creative: 'Voice',
  role: 'character',
}, 
{
  email: 'default+boygo@imaginecouncil.com',
  username: 'BoyGo Mascot',
  favouriteColor: 'Purple',
  hub: 'CGI',
  nodeID: 'https://ic-characters.s3.amazonaws.com/BoyGo+Mascot.png',
  creative: 'Sound',
  role: 'character',
}, 
{
  email: 'default+hucart@imaginecouncil.com',
  username: 'Hucart Manoon',
  favouriteColor: 'Brown',
  hub: 'Superhero',
  nodeID: 'https://ic-characters.s3.amazonaws.com/Hucart+Manoon.png',
  creative: 'Visual',
  role: 'character',
}, 
{
  email: 'default+rovot@imaginecouncil.com',
  username: 'Rovot',
  favouriteColor: 'Yellow',
  hub: 'Robot',
  nodeID: 'https://ic-characters.s3.amazonaws.com/Rovot.png',
  creative: 'Numbers',
  role: 'character',
}, 
// {
//   email: 'default+wolfie@imaginecouncil.com',
//   username: 'Wolfie',
//   favouriteColor: 'White',
//   hub: 'Puppet',
//   nodeID: 'https://ic-characters.s3.amazonaws.com/Wolfie.png',
//   creative: 'Numbers',
//   role: 'character',
// }, 
// {
//   email: 'default+art@imaginecouncil.com',
//   username: 'Art',
//   favouriteColor: 'Green',
//   hub: 'Superhero',
//   nodeID: 'https://ic-characters.s3.amazonaws.com/Art.png',
//   creative: 'Hands',
//   role: 'character',
// },
 {
  email: 'default+michiko@imaginecouncil.com',
  username: 'Michiko',
  favouriteColor: 'Purple',
  hub: 'Anime',
  nodeID: 'https://ic-characters.s3.amazonaws.com/Michiko.png',
  creative: 'Hands',
  role: 'character',
}, 
// {
//   email: 'default+johnny@imaginecouncil.com',
//   username: 'Johnny Griot',
//   favouriteColor: 'Yellow ',
//   hub: 'Superhero',
//   nodeID: 'https://ic-characters.s3.amazonaws.com/Johnny.png',
//   creative: 'Word',
//   role: 'character',
// }, 
// {
//   email: 'default+mothership@imaginecouncil.com',
//   username: 'Mothership',
//   favouriteColor: 'Black',
//   hub: 'Robot',
//   nodeID: 'https://ic-characters.s3.amazonaws.com/Mothership.png',
//   creative: 'Numbers',
//   role: 'character',
// }, 
{
  email: 'default+ogmon@imaginecouncil.com',
  username: 'OG Mon',
  favouriteColor: 'Blue',
  hub: 'Cartoon',
  nodeID: 'https://ic-characters.s3.amazonaws.com/OG+Mon.png',
  creative: 'Words',
  role: 'character',
}, 
{
  email: 'default+pop@imaginecouncil.com',
  username: 'Pop',
  favouriteColor: 'Orange',
  hub: 'Cartoon',
  nodeID: 'https://ic-characters.s3.amazonaws.com/POP.png',
  creative: 'Visual',
  role: 'character',
},
  // {
  //   email: 'default+goodmunchie@imaginecouncil.com',
  //   username: 'GoodMunchie',
  //   favouriteColor: 'Red',
  //   hub: 'Puppet',
  //   nodeID: 'https://ic-characters.s3.amazonaws.com/goodmunchie.png',
  //   creative: 'Hands',
  //   role: 'portal',
  // }, {
  //   email: 'default+airnidas@imaginecouncil.com',
  //   username: 'AirNidas',
  //   favouriteColor: 'Yellow',
  //   hub: 'Cartoon',
  //   nodeID: 'https://ic-characters.s3.amazonaws.com/airnidas.png',
  //   creative: 'Visual',
  //   role: 'portal',
  // }, {
  //   email: 'default+aftayesta@imaginecouncil.com',
  //   username: 'AftaYesta',
  //   favouriteColor: 'Brown',
  //   hub: 'CGI',
  //   nodeID: 'https://ic-characters.s3.amazonaws.com/aftayesta.png',
  //   creative: 'Voice',
  //   role: 'portal',
  // }, {
  //   email: 'default+supfooku@imaginecouncil.com',
  //   username: 'Supfooku',
  //   favouriteColor: 'Blue',
  //   hub: 'CGI',
  //   nodeID: 'https://ic-characters.s3.amazonaws.com/supfooku.png',
  //   creative: 'Sound',
  //   role: 'portal',
  // }, {
  //   email: 'default+culvar@imaginecouncil.com',
  //   username: 'Culvar',
  //   favouriteColor: 'Red',
  //   hub: 'Superhero',
  //   nodeID: 'https://ic-characters.s3.amazonaws.com/culvar.png',
  //   creative: 'Words',
  //   role: 'portal',
  // }, {
  //   email: 'default+goniface@imaginecouncil.com',
  //   username: 'Goniface',
  //   favouriteColor: 'Black',
  //   hub: 'Anime',
  //   nodeID: 'https://ic-characters.s3.amazonaws.com/goniface.png',
  //   creative: 'Hands',
  //   role: 'portal',
  // }
];

const createCharacters = () => {
  const password = 'character123';
  try {
    for (let i = 0; i < characters.length; i++) {
      setTimeout(async () => {
        const isExist = await User.findOne({
          username: characters[i].username,
        });
        if (!isExist) {
          const user = new User({
            username: characters[i].username,
            email: characters[i].email,
            phoneNumber: uuid(), // temporary solution
            type: 'pushuser',
            password: hashPassword(password),
            coinCount: '0',
            verified: false,
            bank: false,
            card: false,
            role: characters[i].role,
            stripeID: '',
            onboarding: false,
            birthDate: null,
            zone: '',
            hub: characters[i].hub,
            creative: characters[i].creative,
            favoriteColor: characters[i].favouriteColor,
            onboarding: true,
            identification: '',
            nodeID: characters[i].nodeID,
            verifiedPhone: true,
            verifyEmail: {
              verifyEmail: { pin: Tools.generatePin(), expiration: Date.now() },
            },
          });
          await User.register(user, password);
        }
        if (i === characters.length - 1) {
          process.exit(1);
        }
      }, i * 500);
    }
  } catch (error) {
    console.log(error);
  }
};

// TODO: remove this script because we're going to create them along with portals
// createCharacters();
