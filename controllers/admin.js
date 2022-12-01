const Product = require('../models/product');
const mongoose = require('mongoose')
const {validationResult} = require('express-validator/check')
const fileHelper = require('../util/file')
exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError:false,
    errorMessage:null,
    
    validationErrors:[]
    // isAuthenticated: req.session.isLoggedIn
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  if(!image){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      product:{
        title:title,
        price:price,
        description:description
      },
      hasError:true,
      errorMessage:`Attach the file isn't image`,
      validationErrors:[]
    });
  }
  const imageUrl = image.path
  errors = validationResult(req)
  console.log(errors)
  if(!errors.isEmpty()){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      product:{
        title:title,
        imageUrl:imageUrl,
        price:price,
        description:description
      },
      hasError:true,
      errorMessage:errors.array()[0].msg,
      
      validationErrors:errors.array()
      // isAuthenticated: req.session.isLoggedIn
    });

  }

  const product = new Product({
    // _id: new mongoose.Types.ObjectId('621e1e08cc5097c2c23a435d'),
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user
  });
  product
    .save()
    .then(result => {
      // console.log(result);
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
      const error = new Error(err)
      error.httpStatusCode = 500;
      next(error)
      // res.redirect('/500')
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError:false,
        errorMessage:null,
        validationErrors:[]
      });
    })
    .catch(err =>{
      const error = new Error(err)
      error.httpStatusCode = 500;
      next(error)
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;
  errors = validationResult(req)
  if(!errors.isEmpty()){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      product:{
        title:updatedTitle,
        price:updatedPrice,
        description:updatedDesc,
        _id:prodId
      },
      hasError:true,
      errorMessage:errors.array()[0].msg,
      validationErrors:errors.array()
      // isAuthenticated: req.session.isLoggedIn
    });

  }
  Product.findById(prodId)
    .then(product => {
      if(product.userId.toString() !== req.user._id.toString()){
        return res.redirect('/')
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;

      if(image){
        fileHelper.deleteFile(product.imageUrl)
        product.imageUrl =image.path;
      }
      
      return product.save();
    })
    .then(result => {
      console.log('UPDATED PRODUCT!');
      res.redirect('/admin/products');
    })
    .catch(err =>{
      const error = new Error(err)
      error.httpStatusCode = 500;
      next(error)
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({userId:req.user._id})
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err =>{
      const error = new Error(err)
      error.httpStatusCode = 500;
      next(error)
    });
};

exports.deleteProduct = (req, res, next) => {

  const prodId = req.params.productId;
  console.log(prodId)

  Product.findById(prodId)
    .then(product=>{
      if(!product){
        return new Error('Product not found')
      }
      fileHelper.deleteFile(product.imageUrl)
      return Product.deleteOne({_id:prodId , userId:req.user._id})
    })
    .then((product) => {
      console.log('DESTROYED PRODUCT')
      res.status(200).json({message:'Success'})
    })
    .catch(err =>{
      res.status(500).json({message:'Failed delete product'})
    });
};
