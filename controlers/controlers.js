const User = require('../models/modelUsers.js');
const Product = require('../models/modelProduct.js');
const Cart = require('../models/modelCart.js');
const Order = require('../models/modelOrder.js');
const Type = require('../models/modelType.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'shop-products',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});

exports.upload = multer({ storage: storage });

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body; 
    const user = await User.findOne({ email: email }); 

    if(!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ message: 'Невірне ім\'я або пароль' });
    } 

    if(user.role !== 'admin') {
      return res.status(403).json({ message: 'У вас немає прав доступу!' });
    } 

    let accessToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' }); 
    let refreshToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('accessToken', accessToken, { 
        httpOnly: true, 
        maxAge: 15 * 60 * 1000,
        secure: true,
        sameSite: 'none'
    }); 
    res.cookie('refreshToken', refreshToken, { 
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000,
        secure: true,
        sameSite: 'none' 
    });

    res.status(200).json({ message: 'Успішний вхід', user: { email: user.email, number: user.number, address: user.address, role: user.role } });
    
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};


exports.getProfil = async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken; 
    if (!accessToken) return res.status(401).json({ message: 'Немає доступу' });

    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email }).select('-password -refreshToken'); 
    if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });

    res.status(200).json(user);
  } catch (error) {
    res.status(401).json({ message: 'Токен прострочений або недійсний' });
  }
};

exports.getProfilUser = async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) return res.status(401).json({ message: 'Немає доступу' });

    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email }).select('-password -refreshToken');
    if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });

    res.status(200).json(user);
  } catch (error) {
    res.status(401).json({ message: 'Токен прострочений або недійсний' });
  }
};


exports.refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken; 
    if (!refreshToken) return res.status(401).json({ message: 'Немає доступу' });

    const user = await User.findOne({ refreshToken: refreshToken });
    if (!user) return res.status(403).json({ message: 'Недійсний токен оновлення' });

    jwt.verify(refreshToken, process.env.JWT_SECRET);

    let newAccessToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    
    res.cookie('accessToken', newAccessToken, { 
        httpOnly: true, 
        maxAge: 15 * 60 * 1000,
        secure: true,
        sameSite: 'none' 
    });
    res.status(200).json({ message: 'Токен оновлено' });
  } catch (error) {
    res.status(401).json({ message: 'Токен прострочений або недійсний' });
  }
};

exports.createProducts = async (req, res) => {
    try {
        const { title, price, count, description, category, type, date } = req.body;

        if (!req.file) return res.status(400).json({ message: "Фото товару є обов'язковим!" });

        let isProduct = await Product.findOne({title: title});
        if(isProduct) return res.status(200).json({ message: "Товар з такою назвою вже існує" });


        const imageUrl = req.file.path; 
        
        const newProduct = new Product({
            title, price: Number(price), count: Number(count), description, category, type, imageUrl, date
        });

        await newProduct.save();
        res.status(201).json({ message: "Товар успішно додано!", product: newProduct });
    } catch (error) {
        console.error("Помилка при створенні товару:", error);
        res.status(500).json({ message: "Помилка сервера при збереженні товару" });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.body;  
        if (!id) return res.status(400).json({ message: 'Не передано ID товару для видалення' });

        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ message: 'Товар не знайдено у базі даних' });

        if (product.imageUrl && product.imageUrl.includes('cloudinary')) {
            const urlParts = product.imageUrl.split('/');
            const folderAndFile = urlParts.slice(-2).join('/');
            const publicId = folderAndFile.split('.')[0];
            
            await cloudinary.uploader.destroy(publicId).catch(err => console.log("Помилка видалення з Cloudinary:", err));
        }

        await Product.findByIdAndDelete(id);
        res.status(200).json({ message: 'Товар та його фото успішно видалено' });
    } catch (error) {
        console.error('Помилка при видаленні товару:', error);
        res.status(500).json({ message: 'Внутрішня помилка сервера при видаленні' });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { id, title, price, count, description, category, type } = req.body;

        const existingProduct = await Product.findById(id);
        if (!existingProduct) return res.status(404).json({ message: 'Товар не знайдено' });

        let updatedData = {
            title, price: Number(price), count: Number(count), description, category, type
        };

        if (req.file) {
            updatedData.imageUrl = req.file.path;

    
            if (existingProduct.imageUrl && existingProduct.imageUrl.includes('cloudinary')) {
                const urlParts = existingProduct.imageUrl.split('/');
                const folderAndFile = urlParts.slice(-2).join('/');
                const publicId = folderAndFile.split('.')[0];

                await cloudinary.uploader.destroy(publicId).catch(err => console.log("Помилка Cloudinary:", err));
            }
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, { $set: updatedData }, { returnDocument: 'after' });
        return res.status(200).json({ product: updatedProduct });

    } catch (error) {
        console.error("Помилка в updateProduct:", error);
        return res.status(500).json({ message: 'Внутрішня помилка сервера' });
    }
};


exports.getProducts = async (req, res) => {
  try {
    let page = req.body.page;
    if (!page) page = 1;

    let limit = req.body.limit;
    if (!limit) limit = 10;

    let search = req.body.search;
    let category = req.body.category;
    let type = req.body.type;

    let query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (category && category !== 'allCategories') {
      query.category = category;
    }
    if (type && type !== 'allTypes') {
      query.type = type;
    }

    let skipItems = (page - 1) * limit;

    let totalItems = await Product.countDocuments(query);
    let products = await Product.find(query).skip(skipItems).limit(limit);

    let totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
      data: products,
      totalPages: totalPages,
      currentPage: page
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};

exports.getShopProducts = async (req, res) => {
  try {
    let page = req.body.page;
    if (!page) page = 1;

    let limit = req.body.limit;
    if (!limit) limit = 8;

    let search = req.body.search;
    let category = req.body.category;
    let types = req.body.types;
    let minPrice = req.body.minPrice;
    let maxPrice = req.body.maxPrice;

    let query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    if (category && category !== 'allProducts') {
      query.category = category;
    }
    if (types && types.length > 0) {
      query.type = { $in: types };
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
    }

    let skipItems = (page - 1) * limit;

    let totalItems = await Product.countDocuments(query);
    let products = await Product.find(query).skip(skipItems).limit(limit);

    let totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
      data: products,
      totalPages: totalPages,
      currentPage: page
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};


exports.getUsers = async (req, res) => {
  try {
    let page = req.body.page;
    if (!page) page = 1;

    let limit = req.body.limit;
    if (!limit) limit = 10;

    let search = req.body.search;
    let searchType = req.body.searchType;
    let role = req.body.role;

    let query = {
        email: { $ne: req.user.email } 
    };

    if (search) {
      query[searchType] = { $regex: search, $options: 'i' };
    }
    if (role && role !== 'allRoles') {
      query.role = role;
    }

    let skipItems = (page - 1) * limit;

    let totalItems = await User.countDocuments(query);
    let users = await User.find(query).skip(skipItems).limit(limit);

    let totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
      data: users,
      totalPages: totalPages,
      currentPage: page
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Помилка сервера" });
  }
};
exports.getAllOrdersForAdmin = async (req, res) => {
  try {
    let page = req.body.page;
    if (!page) page = 1;

    let limit = req.body.limit;
    if (!limit) limit = 10;

    let search = req.body.search;
    let status = req.body.status;
    let sortBy = req.body.sortBy;
    let isShippedView = req.body.isShipped;

    let query = {};

    if (isShippedView === true) {
      query.status = 'Доставлено';
    } else {
      if (status && status !== 'allStatuses') {
        query.status = status;
      } else {
        query.status = { $ne: 'Доставлено' };
      }
    }

    if (search) {
      let users = await User.find({ email: { $regex: search, $options: 'i' } });
      let userIds = [];
      for (let i = 0; i < users.length; i++) {
        userIds.push(users[i]._id);
      }
      query.userId = { $in: userIds };
    }

    let sortQuery = {};
    if (sortBy === 'dateDesc') sortQuery = { date: -1 };
    if (sortBy === 'dateAsc') sortQuery = { date: 1 };
    if (sortBy === 'amountDesc') sortQuery = { totalAmount: -1 };
    if (sortBy === 'amountAsc') sortQuery = { totalAmount: 1 };

    let skipItems = (page - 1) * limit;

    let totalItems = await Order.countDocuments(query);
    let orders = await Order.find(query)
      .populate('userId', 'email number address')
      .sort(sortQuery)
      .skip(skipItems)
      .limit(limit);

    let totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
      data: orders,
      totalPages: totalPages,
      currentPage: page
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};


exports.updateRole = async (req, res) => {
  try {
    let usersId = req.body.userId;
    let newRole = req.body.role;
    let result = await User.findByIdAndUpdate(usersId,{role:newRole},{new:true});
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Помилка сервера при оновлені ролі" });
  }
}

exports.registUser = async (req, res) => {
    try {
        let { email, password, number, address} = req.body;
        let isUser = await User.findOne({email: email});

        if(isUser) {
            res.status(401).json({message: "Така пошта вже викоритовується!"})
        } else {
            let salt = 10;
            let hashPassword = await bcrypt.hash(password,salt);
            await User.create({ email: email, password: hashPassword, role: 'user', number: number, address: address });
            res.status(200).json({message: "Юзера успішно створено"});
        }
    } catch {
        res.status(500).json({ message: "Помилка сервера при реєстрації юзера" });
    }
}


exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body; 
    const user = await User.findOne({ email: email }); 

    if(!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: 'Невірне ім\'я або пароль' });
    } 

    let accessToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    let refreshToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    
    user.refreshToken = refreshToken;
    await user.save();

    
    res.cookie('accessToken', accessToken, { 
        httpOnly: true, 
        maxAge: 15 * 60 * 1000,
        secure: true,
        sameSite: 'none' 
    }); 
    res.cookie('refreshToken', refreshToken, { 
        httpOnly: true, 
        maxAge: 7 * 24 * 60 * 60 * 1000,
        secure: true,
        sameSite: 'none' 
    });

    res.status(200).json({ message: 'Успішний вхід', user: { email: user.email, number: user.number, address: user.address, role: user.role } });
    
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};


exports.updateUser = async (req, res) => {
    try {
        const accessToken = req.cookies.accessToken; 
        if (!accessToken) return res.status(401).json({ message: 'Немає доступу' });

        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        const { number, address } = req.body;
        let updateData = {};
        
        if (number !== undefined) updateData.number = number;
        if (address !== undefined) updateData.address = address;

        const updatedUser = await User.findOneAndUpdate(
            { email: decoded.email }, { $set: updateData }, { new: true } 
        );

        if (!updatedUser) return res.status(404).json({ message: 'Користувача не знайдено' });
        res.status(200).json(updatedUser);
    } 
    catch (error) 
    {
        if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Токен прострочений або недійсний' });
        }
        res.status(500).json({ message: 'Помилка сервера при оновленні профілю' });
    }
};

exports.addToCart = async (req, res) => {
    try {
        const { productId, size } = req.body;
        const userId = req.user._id;

        if (!size) return res.status(400).json({ message: 'Обов\'язково потрібно обрати розмір!' });

        let cart = await Cart.findOne({ userId: userId });

        if (cart === null) {
            cart = new Cart({ userId: userId, items: [{ productId: productId, quantity: 1, size: size }] });
            await cart.save();
            return res.status(200).json({ message: 'Товар додано у кошик' });
        }

        let productExists = false;

        for (let i = 0; i < cart.items.length; i++) {
            const sameProduct = cart.items[i].productId.toString() === productId;
            const sameSize = cart.items[i].size === size;

            if (sameProduct && sameSize) {
                cart.items[i].quantity = cart.items[i].quantity + 1;
                productExists = true;
                break;
            }
        }

        if (productExists === false) {
            cart.items.push({ productId: productId, quantity: 1, size: size });
        }

        await cart.save();
        res.status(200).json({ message: 'Товар додано у кошик' });
    } catch (error) {
        res.status(500).json({ message: 'Помилка додавання у кошик' });
    }
};

exports.getCart = async (req, res) => {
    try {
        const userId = req.user._id;
        const cart = await Cart.findOne({ userId: userId }).populate('items.productId');
        if (cart === null) return res.status(200).json({ items: [] });
        res.status(200).json(cart);
    } catch (error) {
        res.status(500).json({ message: 'Помилка отримання кошика' });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const userId = req.user._id;
        const cart = await Cart.findOne({ userId: userId }).populate('items.productId');
        
        if (cart === null || cart.items.length === 0) return res.status(400).json({ message: 'Ваш кошик порожній' });

        let totalAmount = 0; 
        let orderItems = []; 

        for (let i = 0; i < cart.items.length; i++) {
            const currentItem = cart.items[i];
            const productData = currentItem.productId; 

            if (productData.count < currentItem.quantity) {
                return res.status(400).json({ message: `Не вдалося оформити замовлення. Товару "${productData.title}" залишилося на складі лише ${productData.count} шт.` });
            }

            totalAmount = totalAmount + (productData.price * currentItem.quantity);
            orderItems.push({
                productId: productData._id, 
                title: productData.title, 
                imageUrl: productData.imageUrl,
                price: productData.price, 
                quantity: currentItem.quantity, 
                size: currentItem.size
            });

            productData.count = productData.count - currentItem.quantity;
            await productData.save(); 
        }

        const newOrder = new Order({ userId: userId, items: orderItems, totalAmount: totalAmount, status: 'В обробці', date: new Date() });
        await newOrder.save();
        await Cart.findOneAndDelete({ userId: userId }); 

        res.status(201).json({ message: 'Замовлення успішно оформлено!', order: newOrder });
    } catch (error) {
        res.status(500).json({ message: 'Внутрішня помилка сервера при оформленні замовлення' });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        const orders = await Order.find({ userId }).sort({ date: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Помилка отримання замовлень' });
    }
};

exports.updateCartQuantity = async (req, res) => {
    try {
        const { productId, size, action } = req.body; 
        const userId = req.user._id;

        let cart = await Cart.findOne({ userId: userId });
        if (!cart) return res.status(404).json({ message: 'Кошик не знайдено' });

        for (let i = 0; i < cart.items.length; i++) {
            const sameProduct = cart.items[i].productId.toString() === productId;
            const sameSize = cart.items[i].size === size;

            if (sameProduct && sameSize) {
                if (action === 'plus') {
                    cart.items[i].quantity = cart.items[i].quantity + 1;
                } else if (action === 'minus') {
                    if (cart.items[i].quantity > 1) {
                        cart.items[i].quantity = cart.items[i].quantity - 1;
                    }
                }
                break; 
            }
        }

        await cart.save();
        res.status(200).json({ message: 'Кількість оновлено успішно' });
    } catch (error) {
        res.status(500).json({ message: 'Помилка при оновленні кількості' });
    }
};

exports.removeFromCart = async (req, res) => {
    try {
        const { productId, size } = req.body;
        const userId = req.user._id;

        let cart = await Cart.findOne({ userId: userId });
        if (!cart) return res.status(404).json({ message: 'Кошик не знайдено' });

        cart.items = cart.items.filter(item => {
            const isTargetProduct = item.productId.toString() === productId;
            const isTargetSize = item.size === size;
            return !(isTargetProduct && isTargetSize);
        });

        await cart.save();
        res.status(200).json({ message: 'Товар видалено з кошика' });
    } catch (error) {
        res.status(500).json({ message: 'Помилка при видаленні товару' });
    }
};

exports.updateOrderStatusAdmin = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        let updateData = { status };

        if (status === 'Доставлено') {
            updateData.deliveryDate = new Date(); 
        }

        const updatedOrder = await Order.findByIdAndUpdate(orderId, { $set: updateData }, { new: true }).populate('userId', 'email number address');
        if (!updatedOrder) return res.status(404).json({ message: 'Замовлення не знайдено' });

        res.status(200).json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: 'Помилка сервера' });
    }
};

exports.getTypes = async (req, res) => {
    try {
        const types = await Type.find();
        res.status(200).json(types);
    } catch (error) {
        res.status(500).json({ message: "Помилка сервера при отриманні типів" });
    }
};

exports.createType = async (req, res) => {
    try {
        const { value, category } = req.body;
        
        let isType = await Type.findOne({ value });
        if (isType) {
            return res.status(400).json({ message: "Тип з таким значенням вже існує!" });
        }

        const newType = new Type({ value, category });
        await newType.save();
        
        res.status(201).json({ message: "Тип успішно додано", type: newType });
    } catch (error) {
        res.status(500).json({ message: "Помилка при створенні типу" });
    }
};

exports.deleteType = async (req, res) => {
    try {
        const { id } = req.body;
        
        const typeToDelete = await Type.findById(id);
        if (!typeToDelete) return res.status(404).json({ message: "Категорію не знайдено" });

        const productsToDelete = await Product.find({ type: typeToDelete.value });


        for (let i = 0; i < productsToDelete.length; i++) {
            if (productsToDelete[i].imageUrl && productsToDelete[i].imageUrl.includes('cloudinary')) {
                const urlParts = productsToDelete[i].imageUrl.split('/');
                const folderAndFile = urlParts.slice(-2).join('/');
                const publicId = folderAndFile.split('.')[0];
                await cloudinary.uploader.destroy(publicId).catch(err => console.log("Помилка Cloudinary:", err));
            }
        }

        await Product.deleteMany({ type: typeToDelete.value });
        await Type.findByIdAndDelete(id);

        res.status(200).json({ message: "Категорію та всі пов'язані з нею товари успішно видалено!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Помилка при видаленні типу" });
    }
};

exports.getTypesPaginated = async (req, res) => {
    try {
        let page = req.body.page || 1;
        let limit = req.body.limit || 10;
        let skipItems = (page - 1) * limit;

        let totalItems = await Type.countDocuments();

        let types = await Type.find().skip(skipItems).limit(limit);
        
        let totalPages = Math.ceil(totalItems / limit);

        res.status(200).json({
            data: types,
            totalPages: totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Помилка сервера при отриманні сторінки типів" });
    }
};

exports.logoutAdmin = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            await User.findOneAndUpdate({ refreshToken }, { refreshToken: null }); 
        }
        res.clearCookie('accessToken',{
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        });
        res.clearCookie('refreshToken',{
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        });
        res.status(200).json({ message: 'Вийшли успішно' });
    } catch (error) {
        res.status(500).json({ message: 'Помилка сервера при виході' });
    }
};

exports.logoutUser = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            await User.findOneAndUpdate({ refreshToken }, { refreshToken: null });
        }
        res.clearCookie('accessToken',{
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        });
        res.clearCookie('refreshToken',{
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        });
        res.status(200).json({ message: 'Вийшли успішно' });
    } catch (error) {
        res.status(500).json({ message: 'Помилка сервера при виході' });
    }
};