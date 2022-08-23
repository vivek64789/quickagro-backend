const Notice = require("../models/notice");
const { validateAdmin, validate } = require("../middlewares/validate");
const router = require("express").Router();
const joi = require("joi");
const admin = require("../firebase/config");
const User = require("../models/user");

router.get("/all", validateAdmin, async (req, res) => {
  res.send(await Notice.find().sort({ _id: -1 }));
});

router.post("/remove", validateAdmin, async (req, res) => {
  const schema = joi.object({
    noticeId: joi.string().required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    await Notice.findByIdAndDelete(data.noticeId);
    return res.send("Deleted");
  } catch (err) {
    return res.status(400).send("Something went wrong");
  }
});

router.get("/", validate, async (req, res) => {
  let seen = true;
  let noticeList = [];
  const notices = await Notice.find({ type: req.user.type }).sort({ _id: -1 });
  for (const notice of notices) {
    noticeList.push({
      title: notice.title,
      body: notice.body,
      createdOn: notice.createdOn,
    });
    if (!notice.seenBy.includes(req.user._id) && seen === true) {
      seen = false;
    }
  }

  res.send({ notices: noticeList, seen: seen });
});

router.post("/", validateAdmin, async (req, res) => {
  const schema = joi.object({
    title: joi.string().required(),
    body: joi.string().required(),
    type: joi.string().allow("admin", "client", "courier").required(),
  });

  try {
    const data = await schema.validateAsync(req.body);
    const newNotice = new Notice({
      title: data.title,
      body: data.body,
      type: data.type,
    });

    const users = await User.find({ type: data.type });
    let registrationTokens = [];
    for (const user of users) {
      if (user.firebaseToken !== "") {
        registrationTokens.push(user.firebaseToken);
      }
    }
    
    const msg = {
      data: { type: "notice" },
      notification: { title: data.title, body: data.body },
      tokens: registrationTokens,
    };

    admin
      .messaging()
      .sendMulticast(msg)
      .then((md) => {
        console.log(md);
      });

    return res.send(await newNotice.save());
  } catch (err) {
    console.log(err);
    return res.status(400).send("Something went wrong");
  }
});

router.post("/seen", validate, async (req, res) => {
  const notices = await Notice.find({ type: req.user.type });
  for (const notice of notices) {
    const seenBy = notice.seenBy;
    if (!seenBy.includes(req.user._id)) {
      seenBy.push(req.user._id);
    }
    await Notice.findByIdAndUpdate(notice._id, { seenBy: seenBy });
  }

  res.send("Updated");
});

router.post("/delete-all", validateAdmin, async (req, res) => {
  await Notice.deleteMany({});
  res.send("Deleted");
});

module.exports = router;
