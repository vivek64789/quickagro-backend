const router = require("express").Router();
const { validateAdmin, validate } = require("../middlewares/validate");
const Bundle = require("../models/bundle");
const joi = require("joi");

router.get("/", validate, async (req, res) => {
  res.send(await Bundle.find().sort({_id: -1}));
});

router.post("/get-bundle-by-id", async (req, res) => {
  const schema = joi.object({
    bundleId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    return res.send(await Bundle.findById(data.bundleId));
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/add", validateAdmin, async (req, res) => {
  const schema = joi.object({
    title: joi.string().required(),
    subtitle: joi.string().required(),
    description: joi.string().required(),
    price: joi.number().required(),
    stock: joi.number().required(),
    image: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const newBundle = new Bundle({
      title: data.title,
      subtitle: data.subtitle,
      description: data.description,
      price: data.price,
      stock: data.stock,
      image: data.image,
      createdBy: req.user._id,
    });

    return res.send(await newBundle.save());
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/remove", validateAdmin, async (req, res) => {
  const schema = joi.object({
    bundleId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const removedBundle = await Bundle.findByIdAndDelete(data.bundleId);
    return res.send(removedBundle);
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/update", validateAdmin, async (req, res) => {
  console.log(req.body);
  const schema = joi.object({
    bundleId: joi.string().required(),
    query: joi.object().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    await Bundle.findByIdAndUpdate(data.bundleId, data.query);
    const updatedBundle = await Bundle.findById(data.bundleId);
    return res.send(updatedBundle);
  } catch (err) {
    return res.status(400).send(err);
  }
});

module.exports = router;
