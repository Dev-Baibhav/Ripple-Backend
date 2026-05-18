import express from 'express'
import authController from '../controllers/authController.js'

const router = express.Router()

router.get('/health', (req, res)  => {
    res.status(200).json({
        "message" : "Auth Route Is Healthy"
    })
})

router.post('/signup', authController.signup)

router.post('/signin', authController.signin)

router.post('/forget-password-otp', authController.forgetPasswordOtp)

router.post('/forget-password', authController.forgetPassword)

router.post('/otp', authController.otp)

router.post('/resend-otp', authController.resendOtp)


export default router