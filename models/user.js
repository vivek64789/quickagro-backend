const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: "client",
  },
  token: {
    type: String,
    default: "",
  },
  firebaseToken: {
    type: String,
    default: "",
  },
  phone: {
    type: String,
    default: "",
  },
  profilePic: {
    type: String,
    default: "",
  },
  joinedOn: {
    type: Date,
    default: Date.now,
  },
  orders: {
    type: Array,
    default: [],
  },
  defaultAddress: {
    type: String,
    default: "",
  },
  cart: {
    items: {
      type: Array,
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
      default: 0,
    },
  },
  coupons: [
    {
      couponId: {
        type: String,
        required: true,
      },
      isRedeemed: {
        type: Boolean,
        default: false,
      },
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
