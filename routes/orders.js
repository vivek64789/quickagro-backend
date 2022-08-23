const router = require("express").Router();
const {
  validateClient,
  validate,
  validateAdmin,
  validateCourier,
} = require("../middlewares/validate");
const Order = require("../models/order");
const joi = require("joi");
const Product = require("../models/product");
const User = require("../models/user");
const Bundle = require("../models/bundle");
const Notice = require("../models/notice");
const NodeMailerEmail = require("../models/nodemailer_email");
const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const EmailVerification = require("../models/email_verification");
const admin = require("../firebase/config");

router.get("/", validate, async (req, res) => {
  if (req.user.type === "admin") {
    res.send(await Order.find().sort({ _id: -1 }));
  } else if (req.user.type === "client") {
    res.send(await Order.find({ createdBy: req.user._id }).sort({ _id: -1 }));
  } else if (req.user.type === "courier") {
    const courier = await User.findById(req.user._id);
    res.send(
      await Order.find({ "courier._id": courier._id.toString() }).sort({
        _id: -1,
      })
    );
  } else {
    res.send("Unauthorized");
  }
});

router.post("/get-order-by-id", validate, async (req, res) => {
  const schema = joi.object({
    orderObjId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    return res.send(await Order.findById(data.orderObjId));
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.post("/new", validateClient, async (req, res) => {
  const schema = joi.object({
    items: joi.array().required(),
    paymentMethod: joi.string().required(),
    address: joi.string().required(),
    phone: joi.string().required(),
    coupon: joi.string().min(0).allow("").allow(null),
    discountAmount: joi.number().required(),
    preferredDeliveryDate: joi.string().required(),
    preferredDeliveryTime: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);

    let price = 0;

    if (data.coupon !== "") {
      let myCouponsNew = [];
      const user = await User.findById(req.user._id);
      const coupons = user.coupons;
      for (const coupon of coupons) {
        if (coupon.couponId === data.coupon) {
          myCouponsNew.push({
            _id: coupon._id,
            couponId: coupon.couponId,
            isRedeemed: true,
          });
        } else {
          myCouponsNew.push({
            _id: coupon._id,
            couponId: coupon.couponId,
            isRedeemed: coupon.isRedeemed,
          });
        }
      }

      await User.findByIdAndUpdate(req.user._id, { coupons: myCouponsNew });
    }

    for (const item of data.items) {
      let product;
      if (item.isBundle) {
        product = await Bundle.findById(item.productId);
        let stock = product.stock;
        stock -= item.quantity;
        let sold = product.sold;
        sold += item.quantity;
        await Bundle.findByIdAndUpdate(item.productId, {
          stock: stock,
          sold: sold,
        });
      } else {
        product = await Product.findById(item.productId);
        let stock = product.stock;
        stock -= item.quantity;
        let sold = product.sold;
        sold += item.quantity;
        await Product.findByIdAndUpdate(item.productId, {
          stock: stock,
          sold: sold,
        });
      }
      price += parseInt(product.price) * parseInt(item.quantity);
    }

    price -= data.discountAmount;

    let orderId = 1000;

    const latestOrder = await Order.findOne().sort({ _id: -1 });
    if (latestOrder) {
      orderId = latestOrder.orderId;
      orderId++;
    }

    const user = await User.findById(req.user._id);

    const verificationCode =
      Math.floor(Math.random() * (999999 - 111111)) + 111111;

    const newOrder = new Order({
      createdBy: req.user._id,
      totalPrice: price,
      items: data.items,
      paymentMethod: data.paymentMethod,
      address: data.address,
      phone: data.phone,
      orderId: parseInt(orderId),
      clientName: user.name,
      coupon: data.coupon,
      discountAmount: data.discountAmount,
      verificationCode: verificationCode,
      status: "Ordered",
      preferredDeliveryDate: data.preferredDeliveryDate,
      preferredDeliveryTime: data.preferredDeliveryTime,
    });

    const savedOrder = await newOrder.save();
    console.log(savedOrder);
    const newNotice = new Notice({
      title: `New Order: #${orderId}`,
      body: `Order placed by ${req.user.name}.`,
      type: "admin",
    });
    await newNotice.save();

    const nodeMailerEmail = await NodeMailerEmail.findOne();

    if (!nodeMailerEmail) {
      return res.status(400).send("Add sender email & password");
    }

    // const transporter = nodemailer.createTransport(
    //   smtpTransport({
    //     service: "gmail",
    //     auth: {
    //       user: nodeMailerEmail.email,
    //       pass: nodeMailerEmail.password,
    //     },
    //   })
    // );

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      host: "mail.sakhuwa.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: nodeMailerEmail.email, // generated ethereal user
        pass: nodeMailerEmail.password, // generated ethereal password
      },
    });

    // @TK=U4#P(mr8

    let orderItemsHtml = "";

    for (const item of savedOrder.items) {
      orderItemsHtml += `<tr>
          <td>${savedOrder.items.indexOf(item) + 1}</td>
          <td>${item.title}</td>
          <td>${item.quantity}</td>
          <td>
            ${item.price}
          </td>
          <td>
            ${item.price * item.quantity}
          </td>
        </tr>`;
    }

    const html = `
    <html>

    <head>
        <style>
            p{
                font-size: 1.2rem;
            }
    
            table {
                font-size: 1.2rem;
                font-weight: 500;
                padding-top: 2rem;
                width: 100%;
            }
    
            th {
                background: #DC2E45;
                color: white;
            }
    
            tr {
                height: 4rem;
                text-align: center;
            }
    
            tr:nth-child(even) {
                background: #ffe1e5;
            }
    
            td {
                max-width: 300px;
                text-overflow: ellipsis;
                overflow: hidden;
            }
        </style>
    </head>
    
    <body>
        <h1>Hi ${req.user.name}!</h1><br />
        <h2>Order successfully placed!</h2>
        <p>Order ID #${orderId}</p>
        <div className="content-title">
            <p>Preferred Delivery Time: ${savedOrder.preferredDeliveryDate} ${savedOrder.preferredDeliveryTime
      }</p> 
    <p>Ordered Items: </p>
        </div>
        <table>
            <tr>
                <th>No.</th>
                <th>Name</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
            </tr>
            ${orderItemsHtml}
            <tr>
                <td></td>
                <td></td>
                <td></td>
                <td>
                    <b>Total Amount</b>
                </td>
                <td>
                    <b>
                        ${savedOrder.totalPrice + savedOrder.discountAmount}
                    </b>
                </td>
            </tr>
            <tr>
                <td></td>
                <td></td>
                <td></td>
                <td>
                    <b>Discount Applied</b>
                </td>
                <td>
                    <b>
                        -${savedOrder.discountAmount}
                    </b>
                </td>
            </tr>
            <tr>
                <td></td>
                <td></td>
                <td></td>
                <td>
                    <b>Grand Total</b>
                </td>
                <td>
                    <b>
                        ${savedOrder.totalPrice}
                    </b>
                </td>
            </tr>
        </table>
        <p>Thank you for shopping with us!</p>
    </body>
    
    </html>
    `;

    const options = {
      from: nodeMailerEmail.email,
      to: user.email,
      subject: `Order Placed [Order ID #${orderId}] - Food Agro`,
      html: html,
    };

    transporter.sendMail(options, async (err, info) => {
      if (err) {
        return res.send(err);
      }

      const exist = await EmailVerification.findOne({ email: user.email });
      if (exist) {
        await EmailVerification.findOneAndUpdate(
          { email: user.email },
          { code: verificationCode }
        );
      } else {
        const newVerification = new EmailVerification({
          email: user.email,
          code: verificationCode,
        });

        await newVerification.save();
      }

      console.log(savedOrder);
      res.send(await savedOrder);
    });
  } catch (err) {
    console.log(err);
    return res.status(400).send("Something went wrong");
  }
});

router.post("/cancel-by-client", validateClient, async (req, res) => {
  const schema = joi.object({
    orderObjId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const exist = Order.find({ _id: data.orderObjId, createdBy: req.user._id });

    if (!exist) return res.status(400).json({ msg: "Order not found" });

    const order = await Order.findById(data.orderObjId);
    const items = order.items;

    for (const item of items) {
      let product;
      if (item.isBundle) {
        product = await Bundle.findById(item.productId);
        let stock = product.stock;
        stock += item.quantity;
        let sold = product.sold;
        sold -= item.quantity;
        await Bundle.findByIdAndUpdate(item.productId, {
          stock: stock,
          sold: sold,
        });
      } else {
        product = await Product.findById(item.productId);
        let stock = product.stock;
        stock += item.quantity;
        let sold = product.sold;
        sold -= item.quantity;
        await Product.findByIdAndUpdate(item.productId, {
          stock: stock,
          sold: sold,
        });
      }
    }

    await Order.findByIdAndUpdate(data.orderObjId, {
      isCancelled: true,
      status: "Order Cancelled",
    });

    const newNotice = new Notice({
      title: `Order Cancelled: #${order.orderId}`,
      body: `Order cancelled by client ${req.user.name}.`,
      type: "admin",
    });
    await newNotice.save();

    return res.json("Order cancelled");
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.post("/update-status", validateAdmin, async (req, res) => {
  const schema = joi.object({
    orderObjId: joi.string().required(),
    status: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const exist = await Order.findById(data.orderObjId);
    const items = exist.items;

    if (!exist) return res.status(400).json({ msg: "Order not found" });

    if (data.status.includes("Cancelled")) {
      for (const item of items) {
        let product;
        if (item.isBundle) {
          product = await Bundle.findById(item.productId);
          let stock = product.stock;
          stock += item.quantity;
          let sold = product.sold;
          sold -= item.quantity;
          await Bundle.findByIdAndUpdate(item.productId, {
            stock: stock,
            sold: sold,
          });
        } else {
          product = await Product.findById(item.productId);
          let stock = product.stock;
          stock += item.quantity;
          let sold = product.sold;
          sold -= item.quantity;
          await Product.findByIdAndUpdate(item.productId, {
            stock: stock,
            sold: sold,
          });
        }
      }
    }

    await Order.findByIdAndUpdate(data.orderObjId, {
      isCancelled: data.status.includes("Cancelled") ? true : false,
      isDelivered: data.status === "Delivered" ? true : false,
      status: data.status.includes("Cancelled")
        ? "Order Cancelled by Admin"
        : data.status,
    });

    if (data.status.includes("Cancelled")) {
      const newNotice = new Notice({
        title: `Order Cancelled: #${exist.orderId}`,
        body: `Order cancelled by Admin.`,
        type: "admin",
      });
      await newNotice.save();
    }

    return res.json("Order status updated");
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.post("/reorder", validateClient, async (req, res) => {
  const schema = joi.object({
    orderId: joi.string().required(),
    deliveryDate: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);

    const order = await Order.findById(data.orderId);

    let price = 0;

    for (const item of order.items) {
      const product = Product.findById(item.productId);
      price += product.price * item.quantity;
    }

    const newOrder = new Order({
      createdBy: req.user._id,
      totalPrice: price,
      items: order.items,
      deliveryDate: data.deliveryDate,
      paymentMethod: order.paymentMethod,
      address: order.address,
    });

    res.send(await newOrder.save());
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/assign-courier", validateAdmin, async (req, res) => {
  const schema = joi.object({
    orderId: joi.string().required(),
    courier: joi.object().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    await Order.findByIdAndUpdate(data.orderId, { courier: data.courier });

    const notification_options = {
      priority: "high",
      timeToLive: 60 * 60 * 24,
      collapseKey: "courier_assign",
    };

    const registrationToken = data.courier.firebaseToken;
    const msg = {
      data: { type: "order", orderId: data.orderId },
      notification: {
        title: "New Order",
        body: "You have assigned with a new order!",
      },
    };
    const options = notification_options;

    admin
      .messaging()
      .sendToDevice(registrationToken, msg, options)
      .then((md) => {
        console.log(md);
      });

    return res.send("Courier assigned");
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.post("/unassign-courier", validateAdmin, async (req, res) => {
  const schema = joi.object({
    orderId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    await Order.findByIdAndUpdate(data.orderId, { courier: {} });
    return res.send("Courier unassigned");
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.post("/verify-and-deliver", validateCourier, async (req, res) => {
  const schema = joi.object({
    orderId: joi.string().required(),
    verificationCode: joi.number().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const order = await Order.findById(data.orderId);
    if (order.verificationCode === data.verificationCode) {
      await Order.findByIdAndUpdate(data.orderId, {
        isCancelled: false,
        isDelivered: true,
        status: "Delivered",
        deliveryDate: Date.now(),
      });
      const newNotice = new Notice({
        title: `Order Delivered: #${order.orderId}`,
        body: `Order delivered by courier ${req.user.name}.`,
        type: "admin",
      });
      await newNotice.save();
      return res.send("Verified Successfully & Delivered!");
    } else {
      return res.status(400).send("Invalid Verification Code");
    }
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.post("/get-orders-by-query", validateAdmin, async (req, res) => {
  const schema = joi.object({
    query: joi.object().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    res.send(await Order.find(data.query).sort({ _id: -1 }));
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

module.exports = router;
