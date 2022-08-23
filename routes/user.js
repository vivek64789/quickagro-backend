const router = require("express").Router();
const {
  validate,
  validateClient,
  validateAdmin,
} = require("../middlewares/validate");
const User = require("../models/user");
const Coupon = require("../models/coupon");
const Address = require("../models/address");
const Order = require("../models/order");
const joi = require("joi");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const EmailVerification = require("../models/email_verification");
const NodeMailerEmail = require("../models/nodemailer_email");
const smtpTransport = require("nodemailer-smtp-transport");

router.get("/", validateAdmin, async (req, res) => {
  res.send(await User.find().sort({ _id: -1 }));
});

router.post("/get-users-by-type", validateAdmin, async (req, res) => {
  const schema = joi.object({
    type: joi.string().required().allow("admin", "courier", "client"),
  });

  try {
    const data = await schema.validateAsync(req.body);
    res.send(await User.find({ type: data.type }).sort({ _id: -1 }));
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.get("/couriers", validateAdmin, async (req, res) => {
  res.send(await User.find({ type: "courier" }));
});

router.get("/profile", validate, async (req, res) => {
  res.send(
    await User.findById(req.user._id).select(
      "name email phone profilePic defaultAddress"
    )
  );
});

router.get("/profile/stats", validateClient, async (req, res) => {
  let totalOrders = 0;
  let saved = 0;
  let spent = 0;

  const orders = await Order.find({ createdBy: req.user._id });

  for (const order of orders) {
    totalOrders++;
    if (!order.isCancelled) {
      saved += order.discountAmount;
      spent += order.totalPrice;
    }
  }

  const stats = {
    totalOrders: totalOrders,
    saved: saved,
    spent: spent,
  };

  res.send(stats);
});

router.post("/get-user-by-id", validateAdmin, async (req, res) => {
  const schema = joi.object({
    userId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    return res.send(await User.findById(data.userId));
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/remove", validateAdmin, async (req, res) => {
  const schema = joi.object({
    userId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const removedUser = await User.findByIdAndDelete(data.userId);
    return res.json({ msg: "success", user: removedUser });
  } catch (err) {
    return res.status(400).send(err);
  }
});

router.post("/update", validateAdmin, async (req, res) => {
  const schema = joi.object({
    userId: joi.string().required(),
    query: joi.object().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);

    if (data.query.password != null) {
      const password = data.query.password;
      if (password.toString().length < 6 || password.toString().length > 20) {
        return res.status(400).json({
          msg: "Password should have minimum 6 and maximum 20 characters",
        });
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(data.query.password, salt);
      data.query.password = hashedPassword;
    } else {
      const userData = await User.findById(data.userId);
      data.query.password = userData.password;
    }

    await User.findByIdAndUpdate(data.userId, data.query);
    const updatedUser = await User.findById(data.userId);
    return res.json({ msg: "success", user: updatedUser });
  } catch (err) {
    console.log(err);
    return res.status(400).send(err);
  }
});

router.post("/my-coupons", validate, async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user.coupons.length === 0) {
    return res.send([]);
  } else {
    let myCoupons = [];
    for (var index in user.coupons) {
      let coupon = await Coupon.findById(user.coupons[index].couponId).lean();
      coupon.isRedeemed = user.coupons[index].isRedeemed;
      if (coupon) myCoupons.push(coupon);
    }
    return res.send(myCoupons);
  }
});

router.post("/add-coupon", validateClient, async (req, res) => {
  const schema = joi.object({
    couponCode: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const coupon = await Coupon.find({ code: data.couponCode });
    if (coupon.length !== 0) {
      const user = await User.findById(req.user._id);
      if (user.coupons.toString().includes(coupon[0]._id.toString()))
        return res.status(400).send("Already added!");
      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: {
          coupons: { couponId: coupon[0]._id.toString(), isRedeemed: false },
        },
      });
      return res.send(coupon);
    } else {
      return res.status(400).send("Invalid Coupon Code");
    }
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.get("/address", validateClient, async (req, res) => {
  const address = await Address.find({ createdBy: req.user._id });
  res.send(address);
});

router.post("/address", validateClient, async (req, res) => {
  const schema = joi.object({
    title: joi.string().required(),
    address: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const newAddress = new Address({
      title: data.title,
      address: data.address,
      createdBy: req.user._id,
    });

    const savedAddress = await newAddress.save();
    await User.findByIdAndUpdate(req.user._id, {
      defaultAddress: savedAddress.address,
    });

    const addresses = await Address.find({ createdBy: req.user._id });
    return res.send(addresses);
  } catch (err) {
    console.log(err);
    return res.status(400).send("Something went wrong");
  }
});

router.post("/address/remove", validateClient, async (req, res) => {
  const schema = joi.object({
    addressId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const address = await Address.findById(data.addressId);

    const user = await User.findById(req.user._id);
    if (user.defaultAddress == address.address) {
      await User.findByIdAndUpdate(req.user._id, {
        defaultAddress: "",
      });
    }

    await Address.findByIdAndDelete(data.addressId);

    const addresses = await Address.find({ createdBy: req.user._id });

    return res.send(addresses);
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.post("/phone", validate, async (req, res) => {
  const schema = joi.object({
    phone: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    await User.findByIdAndUpdate(req.user._id, { phone: data.phone });
    return res.send("Phone updated!");
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.post("/change-password", validateClient, async (req, res) => {
  const schema = await joi.object({
    currentPassword: joi.string().required(),
    newPassword: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const user = await User.findById(req.user._id);
    const checkPass = await bcrypt.compare(data.currentPassword, user.password);
    if (!checkPass) return res.status(400).send("Incorrect current password");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.newPassword, salt);

    await User.findByIdAndUpdate(req.user._id, { password: hashedPassword });

    return res.send("Password changed!");
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.post("/change-profile-pic", validate, async (req, res) => {
  const schema = joi.object({ profilePic: joi.string().required() });
  try {
    const data = await schema.validateAsync(req.body);
    await User.findByIdAndUpdate(req.user._id, { profilePic: data.profilePic });
    res.send("Profile Pic updated!");
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.get("/get-admin-contacts", async (req, res) => {
  res.send(
    await User.find({ type: "admin" }).select("name phone email profilePic")
  );
});

router.post("/forgot-password", async (req, res) => {
  const schema = joi.object({
    email: joi.string().email().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);

    const user = await User.findOne({ email: data.email });
    if (!user) {
      return res.status(404).send("User not found");
    }

    const verificationCode =
      Math.floor(Math.random() * (999999 - 111111)) + 111111;

    const nodeMailerEmail = await NodeMailerEmail.findOne();

    if (!nodeMailerEmail) {
      return res.status(400).send("Add sender email & password");
    }

    // const transporter = nodemailer.createTransport(smtpTransport({
    //   service: "gmail",
    //   auth: {
    //     user: nodeMailerEmail.email,
    //     pass: nodeMailerEmail.password,
    //   },
    // }));

    let transporter = nodemailer.createTransport({
      host: "mail.sakhuwa.com",
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: nodeMailerEmail.email, // generated ethereal user
        pass: nodeMailerEmail.password, // generated ethereal password
      },
    });

    const options = {
      from: nodeMailerEmail.email,
      to: user.email,
      subject: "Password Reset - Food Agro",
      html: `Hi ${user.name},<br/><br/>
          You have requested for a password reset. Your verification code is:<br/> 
          <b>${verificationCode}</b><br/><br/>
          Thank you`,
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

      return res.send(info);
    });
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.post("/verify-code", async (req, res) => {
  const schema = joi.object({
    email: joi.string().email().required(),
    code: joi.number().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const verification = await EmailVerification.findOne({
      email: data.email,
      code: data.code,
    });

    if (!verification) {
      return res.status(400).send("Failed");
    }

    if (verification.code === data.code) {
      return res.send("Success");
    }
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.get("/get-mail-settings", validateAdmin, async (req, res) => {
  res.send(await NodeMailerEmail.findOne().select("email"));
});

router.post(
  "/change-mail-settings",
  validateAdmin,
  async (req, res) => {
    const schema = joi.object({
      email: joi.string().email().required(),
      password: joi.string().required(),
    });

    try {
      const data = await schema.validateAsync(req.body);
      await NodeMailerEmail.deleteMany({});
      const newNodeMailerEmail = new NodeMailerEmail({
        email: data.email,
        password: data.password,
      });
      await newNodeMailerEmail.save();
      return res.send(await NodeMailerEmail.find());
    } catch (err) {
      return res.status(400).send("Something went wrong");
    }
  }
);

router.post("/forgot-password/change-pass", async (req, res) => {
  const schema = joi.object({
    code: joi.number().required(),
    email: joi.string().required(),
    password: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const verification = await EmailVerification.findOneAndDelete({
      email: data.email,
      code: data.code,
    });

    if (verification) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(data.password, salt);
      await User.findOneAndUpdate(
        { email: data.email },
        { password: hashedPassword }
      );
      return res.send("Success");
    } else {
      return res.status(400).send("Something went wrong");
    }
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.post("/update-firebase-token", validate, async (req, res) => {
  const schema = joi.object({
    token: joi.string().required()
  });

  try{
    const data = await schema.validateAsync(req.body);
    await User.findByIdAndUpdate(req.user._id, {firebaseToken: data.token});
    return res.send(await User.findById(req.user._id));
  }
  catch(err){
    return res.status(400).send("Something went wrong");  
  }
});

module.exports = router;
