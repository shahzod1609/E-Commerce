const express = require('express');

const authController = require('../controllers/auth');
const User= require('../models/user')

const {check , body} = require('express-validator/check')

const router = express.Router();

router.get('/login', authController.getLogin);

router.post(
    '/login',
    [
        body('email')
          .isEmail()
          .normalizeEmail()
          .withMessage('Please enter a valid email address.'),
        body('password', 'Password has to be valid.')
          .isLength({ min: 5 })
          .isAlphanumeric()
          .trim()
      ],
    authController.postLogin);

router.post('/logout', authController.postLogout);

router.get('/signup', authController.getSignup)

router.post('/signup', 
    [
        check('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please enter a valid email')
            .custom((value ) => {
                return User
                    .findOne({email:value})
                    .then(userDoc => {
                        console.log(userDoc)
                        if(userDoc){
                            return Promise.reject('E-Mail already exists , please pick another one')
                        }
                    })
            }),
        body(
            'password',
            'Please enter a password with only numbers and text and at least 5 characters'
        )
            .isLength({min:5})
            .isAlphanumeric()
            .trim(),
        body('confirmPassword')
            .custom( (value , {req}) =>{
                if(value !== req.body.password) 
                    throw new Error ('Password have to match!')
                return true
            })
            .trim()        
    ],
    authController.postSignup)

router.get('/reset', authController.getReset)

router.post('/reset',[
    body(
        'password',
        'Please enter a password with only numbers and text and at least 5 characters'
    )
        .isLength({min:5})
        .isAlphanumeric()
        .trim(),
] , authController.postReset)

router.get('/reset/:token', authController.getNewPassword)

router.post('/new-password', authController.postNewPassword)

module.exports = router;