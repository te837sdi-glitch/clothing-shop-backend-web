// const mongoose = require('mongoose');

// const typeSchema = new mongoose.Schema({
//     value: { type: String, required: true },
//     category: { type: String, required: true }
// });

// module.exports = mongoose.model('Type', typeSchema);

const mongoose = require('mongoose');

const typeSchema = new mongoose.Schema({
    value: { type: String, required: true },
    category: { type: String, required: true }
});

module.exports = mongoose.model('Type', typeSchema);