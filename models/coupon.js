const { date, number } = require("joi");
const mongoose = require("mongoose");

const couponSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    required: true,
  },
  subsubtitle: {
    type: String,
    default: "",
  },
  code: {
    type: String,
    required: true,
  },
  offerType: {
    type: String,
    required: true,
  },
  offerValue: {
    type: Number,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
  createdOn: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Coupon", couponSchema);
