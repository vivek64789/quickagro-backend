const mongoose = require("mongoose");

const productRequestSchema = mongoose.Schema({
    items: {
        type: Array,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    createdBy: {
        type: String,
        required: true,
    },
    createdOn: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("ProductRequest", productRequestSchema);