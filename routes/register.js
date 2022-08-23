const router = require("express").Router();
const joi = require("joi");
const bcrypt = require("bcrypt");
const User = require("../models/user");

router.post("/", async (req, res) => {
  const schema = joi.object({
    password: joi.string().min(6).max(20).required(),
    name: joi.string().min(3).required(),
    email: joi.string().email({}).required(),
    phone: joi.string().required(),
    type: joi.string().valid("admin", "client", "courier").required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    const emailExist = await User.findOne({ email: data.email });

    if (emailExist)
      return res.status(400).json({ msg: "email is already used" });

    const newUser = new User({
      password: hashedPassword,
      email: data.email,
      name: data.name,
      phone: data.phone,
      type: data.type,
    });

    return res.send(await newUser.save());
  } catch (err) {
    return res.status(400).send(err);
  }
});

module.exports = router;