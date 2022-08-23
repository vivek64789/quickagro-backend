const router = require("express").Router();
const { validateAdmin, validate } = require("../middlewares/validate");
const Category = require("../models/category");
const joi = require("joi");

router.get("/", validate, async (req, res) => {
  res.send(await Category.find().sort({ name: 1 }));
});

router.post("/get-category-by-id", validate, async (req, res) => {
  const schema = joi.object({
    categoryId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    return res.send(await Category.findById(data.categoryId));
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/add", validateAdmin, async (req, res) => {
  const schema = joi.object({
    name: joi.string().required(),
    image: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const newCategory = new Category({
      name: data.name,
      image: data.image,
      createdBy: req.user._id,
    });

    return res.send(await newCategory.save());
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/remove", validateAdmin, async (req, res) => {
  const schema = joi.object({ categoryId: joi.string().required() });

  try {
    const data = await schema.validateAsync(req.body);
    const removedCategory = await Category.findByIdAndDelete(data.categoryId);
    return res.json({ msg: "success", category: removedCategory });
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/update", validateAdmin, async (req, res) => {
  const schema = joi.object({
    categoryId: joi.string().required(),
    query: joi.object().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    await Category.findByIdAndUpdate(data.categoryId, data.query);
    const updatedCategory = await Category.findById(data.categoryId);

    return res.json({ msg: "success", category: updatedCategory });
  } catch (err) {
    console.log(err);
    return res.status(400).send(err);
  }
});

module.exports = router;
