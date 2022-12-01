const path = require('path');
const csrf=require('csurf')
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const multer = require('multer')

const errorController = require('./controllers/error');
const User = require('./models/user');
const csrfProtection = csrf()

const MONGODB_URI =
  'mongodb://127.0.0.1:27017';

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});

const fileStorage = multer.diskStorage({
  destination: (req,file,cb)=>{
    cb(null,'images')
  },
  filename:(req,file,cb) =>{
    cb(null ,  file.originalname)
  }
})
console.log(fileStorage.filename)

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage:fileStorage , fileFilter:fileFilter}).single('image'))

app.use(express.static(path.join(__dirname, 'public')));
app.use('/orders',express.static(path.join(__dirname, 'data')));
app.use( '/images',express.static(path.join(__dirname, 'images')));


app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);
app.use(csrfProtection)
app.use((req,res,next)=>{
  res.locals.isAuthenticated = req.session.isLoggedIn,
  res.locals.csrfToken = req.csrfToken()
  next()
})
app.use((req, res, next) => {
  // throw new Error('Dummy')
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    // throw new Error('Dummy')
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
     
      next();
    })
    .catch(err =>{
      next( new Error(err))
    });
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.get('/500',errorController.get500)
app.use(errorController.get404);
app.use((error , req, res, next) =>{
  // res.redirect('/500')
  console.log(error)
  res.status(500).render('500', {
    pageTitle: 'Error',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn
  });
})


mongoose
  .connect(MONGODB_URI)
  .then(result => {
    app.listen(5000);
  })
  .catch(err => {
    console.log(err);
  });

