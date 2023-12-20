const mongoose = require("mongoose");

const productsSchema = mongoose.Schema ({
    name: String,
    description: String,
    price: Number,
    image: {
        data: Buffer,
        contentType: String,
    },
    quantity: {
        type: Number,
        default: 0,
    }
})


module.exports = mongoose.model("products",productsSchema)