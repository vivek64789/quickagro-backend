var admin = require("firebase-admin");

var serviceAccount = require("./grocery-backend.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;