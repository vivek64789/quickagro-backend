const mongoose = require("mongoose");

const emailVerificationSchema = mongoose.Schema({
    email : {
        type: String,
        required: true
    },
    code: {
        type: Number,
        required: true
    },
});

module.exports = mongoose.model("EmailVerification", emailVerificationSchema);