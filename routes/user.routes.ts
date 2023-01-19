'use strict'

const Router = require('express')
const router = new Router()
const userController = require('../controller/user.controller')

router.get('/users', userController.getUsers)
router.put('/users', userController.setUsersState)
router.delete('/users', userController.deleteUsers)
router.post('/auth/signup', userController.registerUser)
router.post('/auth/login', userController.loginUser)

module.exports = router
