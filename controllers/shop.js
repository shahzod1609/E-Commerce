const Product = require('../models/product');
const Order = require('../models/order');
const path= require('path')
const fs = require('fs')
const PDFdocument = require('pdfkit');
const ITEMS_PAGE=2
// exports.getProducts = (req, res, next) => {
//   Product.find()
//     .then(products => {
//       res.render('shop/product-list', {
//         prods: products,
//         pageTitle: 'All Products',
//         path: '/products',
//         // isAuthenticated: req.session.isLoggedIn
//       });
//     })
//     .catch(err =>{
//       const error = new Error(err)
//       error.httpStatusCode = 500;
//       next(error)
//     });
// };
exports.getProducts = (req, res, next) => {
  let page = +req.query.page || 1
  let countProduct
  Product.find()
    .count()
    .then(numProducts=>{
      countProduct=numProducts
      return Product.find()
        .skip((page-1)*ITEMS_PAGE)
        .limit(ITEMS_PAGE )
    })
    
      .then(products => {
      const lastPage=Math.ceil((countProduct)/ITEMS_PAGE)
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
        itemProduct:countProduct,
        currentPage : page,
        hasPreviousPage: page-1>1,
        hasNextPage:page+1<lastPage,
        previousPage: page-1,
        nextPage:page+1,
        lastPage:lastPage,
        csrfToken : req.csrfToken()
      });
    })
    .catch(err =>{
      const error = new Error(err)
      error.httpStatusCode = 500;
      next(error)
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err =>{
      const error = new Error(err)
      error.httpStatusCode = 500;
      next(error)
    });
};

exports.getIndex = (req, res, next) => {
  let page = +req.query.page || 1
  let countProduct
  Product.find()
    .count()
    .then(numProducts=>{
      countProduct=numProducts
      return Product.find()
        .skip((page-1)*ITEMS_PAGE)
        .limit(ITEMS_PAGE )
    })
    
      .then(products => {
      const lastPage=Math.ceil((countProduct)/ITEMS_PAGE)
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
        itemProduct:countProduct,
        currentPage : page,
        hasPreviousPage: page-1>1,
        hasNextPage:page+1<lastPage,
        previousPage: page-1,
        nextPage:page+1,
        lastPage:lastPage,
        csrfToken : req.csrfToken()
      });
    })
    .catch(err =>{
      const error = new Error(err)
      error.httpStatusCode = 500;
      next(error)
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then(user => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
        csrfToken : req.csrfToken()
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err =>{
      const error = new Error(err)
      error.httpStatusCode = 500;
      next(error)
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err =>{
      const error = new Error(err)
      error.httpStatusCode = 500;
      next(error)
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err =>{
      const error = new Error(err)
      error.httpStatusCode = 500;
      next(error)
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then(user => {
      const products = user.cart.items.map(i => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products
      });
      return order.save();
    })
    .then(result => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch(err =>{
      const error = new Error(err)
      error.httpStatusCode = 500;
      next(error)
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ 'user.userId': req.user._id })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,

        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err =>{
      const error = new Error(err)
      error.httpStatusCode = 500;
      next(error)
    });
};

exports.getInvoice = (req,res,next) =>{
  const orderId = req.params.orderId
  
  Order.findById(orderId)
    .then(order =>{
      if(!order){
        return next(new Error('No order find'))
      }
      if(order.user.userId.toString() !== req.user._id.toString()){
        return next(new Error('Unautherized'))
      }
      const invoiceFile ='invoice-'+orderId+'.pdf'
      const invoicePath = path.join('data','invoices',invoiceFile)
      const pdfDoc = new PDFdocument()
      res.setHeader('Content-Type','application/pdf')
      // res.setHeader('Content-Disposition','inline; filename="' +invoiceFile+ '" ')
      pdfDoc.pipe(fs.createWriteStream(invoicePath))
      pdfDoc.pipe(res)
      pdfDoc.fontSize(26).text('Invoice',{
        underline:true
      })
      pdfDoc.text('--------------------')
      let totalPrice=0
      order.products.forEach(prod => {
        totalPrice+= prod.quantity*prod.product.price
        pdfDoc.fontSize(14).text(prod.product.title + '-' + prod.quantity + ' x ' + '$'+ prod.quantity*prod.product.price)
      })
      pdfDoc.text('-----')
      pdfDoc.fontSize(20).text('Total Price is $'+totalPrice)
      pdfDoc.end()
      // fs.readFile(invoicePath , (err,data)=>{
      //   if(err){
      //     return next(err)
      //   }        
      //   res.writeHead(200,{'Content-Type':'application/txt'})    
      //   res.send(data)
      // })
    })
    .catch(err=>next(err))

  

}
