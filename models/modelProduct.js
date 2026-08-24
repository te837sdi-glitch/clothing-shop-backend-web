// const mongoose = require('mongoose');

// const productSchema = new mongoose.Schema({
//     title: { type: String, required: true },
//     price: { type: Number, required: true },
//     count: { type: Number, required: true },
//     description: { type: String, required: true },
//     category: { type: String, required: true },
//     type: { type: String, required: true },
//     imageUrl: { type: String, required: true },
//     date: {type: Date, required: true}
// });

// module.exports = mongoose.model('Product', productSchema);

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    price: { type: Number, required: true },
    sizes: [{
        size: { type: String, required: true },
        count: { type: Number, required: true, default: 0 }
    }],
    description: { type: String, required: true },
    category: { type: String, required: true },
    type: { type: String, required: true },
    imageUrl: { type: String, required: true },
    date: {type: Date, required: true}
});

module.exports = mongoose.model('Product', productSchema);