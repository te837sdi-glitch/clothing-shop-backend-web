
const jwt = require('jsonwebtoken');
const User = require('../models/modelUsers.js');

const authUser = async (req, res, next) => {
    try {
        const token = req.cookies.accessToken;
        
        if (!token) return res.status(401).json({ message: 'Немає доступу' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ email: decoded.email });

        if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Недійсний токен' });
    }
};

module.exports = authUser;