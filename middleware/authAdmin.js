
// const jwt = require('jsonwebtoken');
// const User = require('../models/modelUsers.js');

// const authAdmin = async (req, res, next) => {
//     try {
        
//         const token = req.cookies.accessToken;
        
//         if (!token) {
//             return res.status(401).json({ message: 'Немає доступу (токен відсутній)' });
//         }

//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         const user = await User.findOne({ email: decoded.email });

//         if (!user) {
//             return res.status(404).json({ message: 'Користувача не знайдено' });
//         }

//         if (user.role !== 'admin') {
//             return res.status(403).json({ message: 'У вас немає прав адміністратора!' });
//         }

//         req.user = user;
//         next();

//     } catch (error) {
//         if (error.name === 'TokenExpiredError') {
//             return res.status(401).json({ message: 'Токен прострочений' });
//         }
//         return res.status(401).json({ message: 'Недійсний токен' });
//     }
// };

// module.exports = authAdmin;

const jwt = require('jsonwebtoken');
const User = require('../models/modelUsers.js');

const authAdmin = async (req, res, next) => {
    try {
        const token = req.cookies.accessToken;
        if (!token) return res.status(401).json({ message: 'Немає доступу (токен відсутній)' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ email: decoded.email });

        if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });
        if (user.role !== 'admin') return res.status(403).json({ message: 'У вас немає прав адміністратора!' });

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Токен прострочений' });
        }
        return res.status(401).json({ message: 'Недійсний токен' });
    }
};
module.exports = authAdmin;