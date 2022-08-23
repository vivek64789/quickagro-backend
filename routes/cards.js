const router = require("express").Router();
const { validateClient } = require("../middlewares/validate");
const Card = require("../models/card");
const joi = require("joi");

router.get("/", validateClient, async (req, res) => {
  res.send(await Card.find({ createdBy: req.user._id }));
});

router.post("/add", validateClient, async (req, res) => {
  const schema = joi.object({
    name: joi.string().required(),
    number: joi.string().required(),
    cvv: joi.number().min(3).max(3).required(),
    expDate: joi.string().required(),
    createdBy: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const newCard = new Card({
      name: data.name,
      number: data.number,
      cvv: data.cvv,
      expDate: data.expDate,
      createdBy: req.user._id,
    });

    return res.send(await newCard.save());
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/remove", validateClient, async (req, res) => {
  const schema = joi.object({
    cardId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const removedCard = await Card.findByIdAndDelete(data.cardId);
    return res.json({ msg: "success", card: removedCard });
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/update", validateClient, async (req, res) => {
  const schema = joi.object({
    cardId: joi.string().required(),
    query: joi.object().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    await Card.findByIdAndUpdate(data.cardId, data.query);
    const updatedCard = await Card.findById(data.cardId);
    return res.json({ msg: "success", card: updatedCard });
  } catch (err) {
    return res.status(400).send(err);
  }
});

module.exports = router;
