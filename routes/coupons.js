const router = require("express").Router();
const { validateAdmin } = require("../middlewares/validate");
const Coupon = require("../models/coupon");
const joi = require("joi");

router.get("/", validateAdmin, async (req, res) => {
  res.send(await Coupon.find().sort({_id: -1}));
});

router.post("/get-coupon-by-id", validateAdmin, async (req, res) => {
  const schema = joi.object({
    couponId: joi.string().required()
  });

  try{
    const data = await schema.validateAsync(req.body);
    return res.send(await Coupon.findById(data.couponId));
  }
  catch(err){
    return res.status(400).send(err);
  }
});

router.post("/add", validateAdmin, async (req, res) => {
  const schema = joi.object({
    title: joi.string().required(),
    subtitle: joi.string().required(),
    subsubtitle: joi.string().required(),
    code: joi.string().required(),
    expiryDate: joi.date().required(),
    offerType: joi.string().required(),
    offerValue: joi.number().min(0).max(100).required(),
  });

  try {
    const data = await schema.validateAsync(req.body);

    const newCoupon = new Coupon({
      title: data.title,
      subtitle: data.subtitle,
      subsubtitle: data.subsubtitle,
      code: data.code,
      expiryDate: data.expiryDate,
      createdBy: req.user._id,
      offerType: data.offerType,
      offerValue: data.offerValue
    });

    return res.send(await newCoupon.save());
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/remove", validateAdmin, async (req, res) => {
  const schema = joi.object({
    couponId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const deletedCoupon = await Coupon.findByIdAndDelete(data.couponId);
    return res.json({ msg: "success", coupon: deletedCoupon });
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/update", validateAdmin, async (req, res) => {
  const schema = joi.object({
    couponId: joi.string().required(),
    query: joi.object().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    await Coupon.findByIdAndUpdate(data.couponId, data.query);

    return res.send(await Coupon.findById(data.couponId));
  } catch (err) {
    return res.send(err);
  }
});

router.post("/get-coupons-by-type", validateAdmin, async (req, res) => {
  const schema = joi.object({
    offerType: joi.string().required().allow("amount", "percentage"),
  });

  try{
    const data = await schema.validateAsync(req.body);
    res.send(await Coupon.find({offerType: data.offerType}).sort({_id: -1}))
  }
  catch(err){
    return res.status(400).send("Something went wrong");
  }
});

module.exports = router;
