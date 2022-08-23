const router = require("express").Router();
const joi = require("joi");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

router.post("/", async (req, res) => {
  const schema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);

    const userExist = await User.findOne({ email: data.email });

    if (!userExist)
      return res.status(403).json("incorrect email or password");

    const checkPass = await bcrypt.compare(data.password, userExist.password);

    if (!checkPass)
      return res.status(403).json("incorrect email or password");

    const token = jwt.sign(userExist.email, process.env.TOKEN_SECRET);

    await User.updateOne({ email: userExist.email }, { token: token });

    return res.json({
      email: userExist.email,
      name: userExist.name,
      token: token,
      type: userExist.type,
      profilePic: userExist.profilePic,
    });

  } catch (err) {
    console.log(err)
    return res.status(400).send("Something went wrong");
  }
});

module.exports = router;