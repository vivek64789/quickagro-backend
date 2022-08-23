const { validateAdmin } = require("../middlewares/validate");
const router = require("express").Router();
const Product = require("../models/product");
const Bundle = require("../models/bundle");
const Category = require("../models/category");
const Order = require("../models/order");
const User = require("../models/user");

router.get("/", validateAdmin, async (req, res) => {
  let dashboardData = {
    totalProducts: 0,
    totalBundles: 0,
    totalCategories: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalEarnings: 0,
  };

  let totalEarnings = 0;

  const orders = await Order.find();
  for(const order of orders){
    if (order.isDelivered) {
      totalEarnings += order.totalPrice;
    }
  }

  dashboardData.totalUsers = await User.count();
  dashboardData.totalProducts = await Product.count();
  dashboardData.totalBundles = await Bundle.count();
  dashboardData.totalCategories = await Category.count();
  dashboardData.totalOrders = await Order.count();
  dashboardData.totalEarnings = totalEarnings;
  res.send(dashboardData);
});

module.exports = router;
