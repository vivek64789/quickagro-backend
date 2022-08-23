const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const orderSchema = mongoose.Schema({
  createdBy: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  coupon: {
    type: String,
    default: "",
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  items: {
    type: Array,
    required: true,
  },
  preferredDeliveryDate: {
    type: String,
    required: true,
  },
  preferredDeliveryTime: {
    type: String,
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  clientName: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: "Ordered",
  },
  courier: {
    type: Object,
    default: {},
  },
  isCancelled: {
    type: Boolean,
    default: false,
  },
  isDelivered: {
    type: Boolean,
    default: false,
  },
  orderId: {
    type: Number,
    required: true,
  },
  verificationCode: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Order", orderSchema);
