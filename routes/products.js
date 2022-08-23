const router = require("express").Router();
const {
  validateAdmin,
  validateClient,
  validate,
} = require("../middlewares/validate");
const joi = require("joi");
const Product = require("../models/product");
const ProductRequest = require("../models/product_request");
const User = require("../models/user");

router.get("/", validate, async (req, res) => {
  res.send(await Product.find().sort({ _id: -1 }));
});

router.get("/popular", validate, async (req, res) => {
  res.send(await Product.find().sort({ sold: -1 }));
});

router.post("/get-product-by-id", validate, async (req, res) => {
  const schema = joi.object({
    productId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    return res.send(await Product.findById(data.productId));
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/add", validateAdmin, async (req, res) => {
  const schema = joi.object({
    title: joi.string().required(),
    description: joi.string().required(),
    price: joi.number().required(),
    stock: joi.number().required(),
    weight: joi.string().required(),
    images: joi.array().required(),
    category: joi.object().required(),
    tags: joi.array(),
  });

  try {
    const data = await schema.validateAsync(req.body);

    const newProduct = new Product({
      title: data.title,
      description: data.description,
      price: data.price,
      stock: data.stock,
      weight: data.weight,
      images: data.images,
      category: data.category,
      createdBy: req.user._id,
      tags: data.tags,
    });

    return res.send(await newProduct.save());
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/remove", validateAdmin, async (req, res) => {
  const schema = joi.object({ productId: joi.string().required() });

  try {
    const data = await schema.validateAsync(req.body);
    const removedProduct = await Product.findByIdAndDelete(data.productId);
    return res.json({ msg: "success", product: removedProduct });
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/update", validateAdmin, async (req, res) => {
  const schema = joi.object({
    productId: joi.string().required(),
    query: joi.object().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    await Product.findByIdAndUpdate(data.productId, data.query);
    const updatedProduct = await Product.findById(data.productId);

    return res.json({ msg: "success", product: updatedProduct });
  } catch (err) {
    return res.send(err);
  }
});

router.post("/search", validate, async (req, res) => {
  const schema = joi.object({
    keyword: joi.string().required(),
    query: joi.object().required(),
    sortBy: joi.string().allow(""),
  });

  try {
    const data = await schema.validateAsync(req.body);
    let query = data.query;
    query.$or = [
      { title: { $regex: data.keyword, $options: "i" } },
      { tags: { $regex: data.keyword, $options: "i" } },
    ];
    const products = await Product.find(query).sort(
      data.sortBy === "popularity"
        ? { sold: -1 }
        : data.sortBy === "pricelth"
        ? { price: 1 }
        : data.sortBy === "pricehtl"
        ? { price: -1 }
        : { _id: -1 }
    );
    return res.send(products);
  } catch (err) {
    return res.send(err);
  }
});

router.post("/request", validateClient, async (req, res) => {
  const schema = joi.object({
    items: joi.array().required(),
    image: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);

    const reqExist = await ProductRequest.findOne({
      items: data.items,
      createdBy: req.user._id,
    });

    if (reqExist)
      return res.status(400).json({ msg: "Already exist", item: reqExist });

    const productRequest = new ProductRequest({
      items: data.items,
      image: data.image,
      createdBy: req.user._id,
    });

    return res.send(await productRequest.save());
  } catch (err) {
    return res.send(err);
  }
});

router.get("/request", validateAdmin, async (req, res) => {
  let requestList = [];
  const requests = await ProductRequest.find();
  for (const request of requests) {
    const user = await User.findById(request.createdBy);
    requestList.push({
      _id: request._id,
      user: { name: user.name, email: user.email },
      date: request.createdOn,
      items: request.items,
      image: request.image,
    });
  }

  res.send(requestList.reverse());
});

router.post("/request/remove", validateAdmin, async (req, res) => {
  const schema = joi.object({
    requestId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    await ProductRequest.findByIdAndDelete(data.requestId);
    res.send("Product request deleted");
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.post("/get-products-by-category", validate, async (req, res) => {
  const schema = joi.object({
    categoryId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    res.send(
      await Product.find({ "category.id": data.categoryId }).sort({ _id: -1 })
    );
  } catch (e) {
    return res.status(400).send("Something went wrong");
  }
});

router.post("/get-related-products", validate, async (req, res) => {
  const schema = joi.object({
    productId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const product = await Product.findById(data.productId);
    const products = await Product.find({
      "category.name": product.category.name,
    });
    let relatedProducts = [];
    for (const product of products) {
      if (product._id.toString() !== data.productId) {
        relatedProducts.push(product);
      }
    }
    return res.send(relatedProducts);
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

module.exports = router;
