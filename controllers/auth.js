const User = require('../models/user');
const bcrypt = require('bcryptjs')
const nodemailer= require('nodemailer')
const crypto = require('crypto')
const {validationResult} = require('express-validator/check')

exports.getLogin = (req, res, next) => {
  let message = req.flash('error')
  if(message.length>0){
    message=message[0]
  }
  else{
    message=null
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage:message,
    oldInput:{
      email:'',
      password:''
    },
    validationErrors:[]
    // isAuthenticated: false
  });
};

exports.postLogin = (req, res, next) => {
  const email=req.body.email
  const password=req.body.password
  ///
  const errors = validationResult(req)
  if(!errors.isEmpty()){
    return res.status(422).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage:errors.array()[0].msg,
      oldInput:{
        email:email,
        password:password
      },
      validationErrors:errors.array()
    });
  }
  User.findOne({email:email})
    .then(user => {
      if(!user){
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage:'Invalid email ',
          oldInput:{
            email:email,
            password:password
          },
          validationErrors:[]
        });
      }
      bcrypt
        .compare(password , user.password)
        .then( doMatch =>{
          if(doMatch){
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save(err =>{
              if(err)console.log(err)
              res.redirect('/')
            })
          }
          return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage:'Invalid  password',
            oldInput:{
              email:email,
              password:password
            },
            validationErrors:[]
          });
        })
        .catch(err =>{
          const error = new Error(err)
          error.httpStatusCode = 500;
          next(error)
        });
      
    })
    .catch(err =>{
      const error = new Error(err)
      error.httpStatusCode = 500;
      next(error)
    });
}

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getSignup = (req,res,next) => {
  let message=req.flash('error')
  if(message.length>0){
    message=message[0]
  }else{
    message=null
  }
  res.render('auth/signup',{
    path:'/signup',
    pageTitle: 'Signup',
    errorMessage:message,
    oldInput:{
      email:'',
      password:'',
      confirmPassword:''
    },
    validationErrors:[]
    // isAuthenticated:false
  })
}


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'hallievshahzad7@gmail.com',
    pass: 'shahzad160903160903',
  },
});

exports.postSignup = (req,res,next) => {
  const email = req.body.email
  const password = req.body.password
  // const confirmPassword = req.body.confirmPassword
  const errors = validationResult(req)
  if(!errors.isEmpty()){
    return res.status(422).render('auth/signup',{
      path:'/signup',
      pageTitle: 'Signup',
      errorMessage:errors.array()[0].msg,
      oldInput:{
        email:email,
        password:password,
        confirmPassword:req.body.confirmPassword
      },
      validationErrors:errors.array()
      // isAuthenticated:false
    })
  }
    bcrypt
        .hash(password , 12)
        .then(hashPassword => {
          const user = new User ({
            email: email,
            password: hashPassword,
            cart:{items:[]}  
          })
          return user.save()
            .then(result=> {
              ///
              
              transporter.sendMail({
                from:'shop@node-complete',
                to:email,
                subject:'Signup succeeded',
                html:'<h1>Successfully signed up</h1>'
              },(err,info)=>{
                if(err){
                  console.log(err)
                }else{
                  console.log('Succeed')
                }
              })
              res.redirect('/login')
            })
            .catch(err =>{
              const error = new Error(err)
              error.httpStatusCode = 500;
              next(error)
            });
        })    
}

exports.getReset = (req,res,next) =>{
  let message=req.flash('error')
  if(message.length>0){
    message=message[0]
  }else{
    message=null
  }
  res.render('auth/reset',{
    pageTitle:'Reset Password',
    path:'/reset',
    errorMessage:message
  })
}

exports.postReset = (req, res, next) =>{
  const errors = validationResult(req)
  if(!errors.isEmpty()){
    return res.status(422).render('auth/signup',{
      path:'/signup',
      pageTitle: 'Signup',
      errorMessage:errors.array()[0].msg,
      oldInput:{
        email:email,
        password:password,
        confirmPassword:req.body.confirmPassword
      },
      validationErrors:errors.array()
      // isAuthenticated:false
    })
  }
  crypto.randomBytes(32 , (err,info)=>{
    if(err){
      console.log(err)
      return res.redirect('/reset')
    }
    const token = info.toString('hex')
    User
      .findOne({email:req.body.email})
      .then(user => {
        if(!user){
          req.flash('error','No account with that email found')
          return res.redirect('/reset')
        }
        user.resetToken=token
        user.resetTokenExpiration=Date.now() + 3600000
        return user.save()
      })
      .then(result =>{
        res.redirect(`/reset/${token}`)
        transporter.sendMail({
          to:req.body.email,
          from:'shop@node-complete.com',
          subject:'Password reset',
          html:`
            <p> You requested a password reset </p>
            <p> Click this <a href=http://localhost:3000/reset/${token}>link</a> to set a new password </p>
          `
        })
      })
      .catch(err =>{
        const error = new Error(err)
        error.httpStatusCode = 500;
        next(error)
      });

  })
}

exports.getNewPassword = (req,res,next) =>{
  const token = req.params.token
  User.findOne({resetToken:token , resetTokenExpiration:{$gt:Date.now()}})
    .then(user => {
      let message=req.flash('error')
      if(message.length>0){
      message=message[0]
      }else{
        message=null
      }
      res.render('auth/new-password',{
        pageTitle:'New Password',
        path:'/new-password',
        errorMessage:message,
        userId: user._id.toString(),
        passwordToken: token
      })
    })
    .catch(err =>{
      const error = new Error(err)
      error.httpStatusCode = 500;
      next(error)
    });
}

exports.postNewPassword = (req,res,next) =>{
  const password = req.body.password 
  const userId = req.body.userId
  const passwordToken = req.body.passwordToken
  console.log(passwordToken)
  let resetUser
  User.findOne({
      resetToken:passwordToken , 
      resetTokenExpiration:{$gt:Date.now()}, 
      _id:userId
    })
    .then(user=>{
      resetUser=user
      return bcrypt.hash(password,12)
    })
    .then(hashedPassword => {
      console.log(hashedPassword)
      resetUser.password = hashedPassword
      resetUser.resetToken = undefined
      resetUser.resetTokenExpiration=undefined
      return resetUser.save()
    })
    .then(result=>{
      console.log(result)
      res.redirect('/login')
    })
    .catch(err =>{
      const error = new Error(err)
      error.httpStatusCode = 500;
      next(error)
    });


}