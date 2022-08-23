const stripe = require("stripe")(process.env.STRIPE_KEY);
const router = require("express").Router();
const joi = require("joi");
const { validateClient } = require("../middlewares/validate");

router.post("/get-client-secret", validateClient, async (req, res) => {
  const schema = joi.object({
    amount: joi.number().required(),
    currency: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: data.amount,
      currency: data.currency,
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {}
});

module.exports = router;
