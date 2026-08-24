// const mongoose = require('mongoose');

// const orderSchema = new mongoose.Schema({
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//     items: [{
//         productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
//         title: String,
//         imageUrl: String,
//         price: Number,
//         quantity: Number,
//         size: String
//     }],
//     totalAmount: { type: Number, required: true },
//     status: { type: String, enum: ['В обробці', 'В дорозі', 'Доставлено'], default: 'В обробці' },
//     date: { type: Date, default: Date.now },
//     deliveryDate: { type: Date } 
// });

// module.exports = mongoose.model('Order', orderSchema);

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        title: String,
        imageUrl: String,
        price: Number,
        quantity: Number,
        size: String
    }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['В обробці', 'В дорозі', 'Доставлено'], default: 'В обробці' },
    date: { type: Date, default: Date.now },
    deliveryDate: { type: Date } 
});

module.exports = mongoose.model('Order', orderSchema);