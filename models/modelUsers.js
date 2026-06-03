const mongoose = require('mongoose');

module.exports = mongoose.model('User', {
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: 'user' },
  number: { type: String, required: true },
  address: { type: String, required: true },
  refreshToken: { type: String, default: null }
});