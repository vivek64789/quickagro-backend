const User = require("../models/user");
const jwt = require("jsonwebtoken");

const validateClient = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.status(401).send("Unauthorized");

  jwt.verify(token, process.env.TOKEN_SECRET, async (err, user) => {
    if (err) return res.status(401).send("Unauthorized");
    const userData = await User.findOne({ email: user });
    if(userData.type != "client") return res.status(401).send("Unauthorized");
    req.user = userData;
    next();
  });
};

const validateAdmin = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.status(401).send("Unauthorized");

  jwt.verify(token, process.env.TOKEN_SECRET, async (err, user) => {
    if (err) return res.status(401).send("Unauthorized");
    const userData = await User.findOne({ email: user });
    if(userData.type != "admin") return res.status(401).send("Unauthorized");
    req.user = userData;
    next();
  });
};

const validateCourier = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.status(401).send("Unauthorized");

  jwt.verify(token, process.env.TOKEN_SECRET, async (err, user) => {
    if (err) return res.status(401).send("Unauthorized");
    const userData = await User.findOne({ email: user });
    if(userData.type != "courier") return res.status(401).send("Unauthorized");
    req.user = userData;
    next();
  });
};


const validate = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.status(401).send("Unauthorized");

  jwt.verify(token, process.env.TOKEN_SECRET, async (err, user) => {
    if (err) return res.status(401).send("Unauthorized");
    const userData = await User.findOne({ email: user });
    req.user = userData;
    next();
  });
};

module.exports = {validateClient, validateAdmin, validateCourier, validate};
