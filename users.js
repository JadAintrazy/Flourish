const mongoose = require("mongoose");

const usersSchema = mongoose.Schema ({
    id: Number,
    name: String,
    email: String,
    password: String,
    admin: {
        type: Boolean,
        default: false,
    }
})


module.exports = mongoose.model("users",usersSchema)