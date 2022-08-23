const router = require("express").Router();
const { validateClient } = require("../middlewares/validate");
const User = require("../models/user");
const joi = require("joi");

router.get("/", validateClient, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.send(user.cart);
});

router.post("/", validateClient, async (req, res) => {
  const schema = joi.object({
    cartItems: joi.object().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    await User.findByIdAndUpdate(req.user._id, { cart: data.cartItems });
    const user = await User.findById(req.user._id);
    return res.send(user.cart);
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

module.exports = router;
