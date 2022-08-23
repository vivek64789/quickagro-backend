const mongoose = require("mongoose");

const chatSchema = mongoose.Schema({
    clientId: {
        type: String    
    }
});

module.exports = mongoose.model("Chat", chatSchema);