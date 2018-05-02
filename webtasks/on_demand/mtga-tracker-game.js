'use latest';

import bodyParser from 'body-parser';
import express from 'express';
import Webtask from 'webtask-tools';
import { MongoClient, ObjectID } from 'mongodb';

const ejwt = require('express-jwt');

var secrets; // babel makes it so we can't const this, I am pretty sure
try {
  secrets = require('./secrets.js')
} catch (e) {
  secrets = require('./secrets-template.js')
}

const {
  clientVersionUpToDate,
  createAnonymousToken,
  createToken,
  differenceMinutes,
  Game,
  getCookieToken,
  getGameById,
  getGithubStats,
  getPublicName,
  logError,
  parseVersionString,
  random6DigitCode,
  randomString,
  routeDoc,
  sendDiscordMessage,
  deckCollection,
  gameCollection,
  userCollection,
  errorCollection,
} = require('../util')

const BluebirdPromise = require('bluebird')
global.Promise = BluebirdPromise
Promise.onPossiblyUnhandledRejection((e, promise) => {
    throw e
})

const server = express();

server.use(bodyParser.json());

const publicAPI = require('./api/public-api')
const anonAPI = require('./api/anon-api')
const userAPI = require('./api/user-api')
const adminAPI = require('./api/admin-api')

let userIsAdmin = (req, res, next) => {
  console.log("testing for admin")
  if (req.user.user == "Spencatro") {
    console.log("congrats, you are an admin")
    next()
  } else {
    res.status(400).send({"error": "you are not an admin, sorry :'("})
  }
}


server.use('/public-api', publicAPI)
server.use('/anon-api', ejwt({secret: secrets.jwtSecret, getToken: getCookieToken}), anonAPI)
server.use('/api', ejwt({secret: secrets.jwtSecret, getToken: getCookieToken}), userAPI)
server.use('/admin-api', ejwt({secret: secrets.jwtSecret, getToken: getCookieToken}), userIsAdmin, adminAPI)

server.get('/', (req, res, next) => {
  res.status(200).send({
    "/public-api": routeDoc(publicAPI.stack),
    "/anon-api": routeDoc(anonAPI.stack),
    "/api": routeDoc(userAPI.stack),
  })
})

// no cover - not testable?
server.get('*', function(req, res) {
  console.log('retrieving page: ' + JSON.stringify(req.params))

  const { MONGO_URL, DATABASE } = req.webtaskContext.secrets;
  MongoClient.connect(MONGO_URL, (err, client) => {
   logError(client, DATABASE, {error: "unknown access: " +  JSON.stringify(req.params)}, (result, err) => {
      client.close();
      if (err) return next(err);
      res.status(404).send({error: "route is not valid", warning: "this access has been logged; if you are misusing this API, your address may be banned!"})
   })
  })
})

module.exports = Webtask.fromExpress(server);