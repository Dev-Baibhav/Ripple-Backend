// Auth Routers

import User from "../models/userSchema.js";
import otpMethods from "../services/redisOtpVerification.js";
import sendOtp from "../services/resendMethod.js";
import jwt from 'jsonwebtoken'
import { configDotenv } from "dotenv";
import redisMethods from "../services/redisOtpVerification.js";
configDotenv();

// Sign Up
const signup = async (req, res) => {

    try {
        const user = await User.create({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password
        })

        // Sending OTP
        await sendOtp(req.body.email)

        // Generating JWT Token
        const token = jwt.sign(
            {
                username: user.username,
                email: user.email,
                createdAt: user.createdAt
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "60s"
            }
        )

        res.status(201).json([user, token])
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}

// Sign In
const signin = async (req, res) => {
    if(req.body.email && req.body.password) {
        let user = {};
        try {
            user = await User.findOne({
                email: req.body.email
            })
        } catch (error) {
            console.log(error.message);
            res.status(500).json(error.message)
            return;
        }

        if(user.email == req.body.email && user.isVerified == true)  {
            res.status(202).json({
                "message" : "Login Sucessful",
                user
            })
        }   else    {
            // Sending OTP
            await sendOtp(req.body.email)

            // Generating JWT Token
            const token = jwt.sign(
                {
                    username: user.username,
                    email: user.email,
                    createdAt: user.createdAt
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "60s"
                }
            )
            res.status(401).json({
                "message" : "Kindly Verify Your Email!!!",
                token
            })
        }
    }   else    {
        res.status(404).json({
            "message" : "Incomplete Details",
        })
    }
}

// Forget Password OTP
const forgetPasswordOtp = async (req, res) => {
    console.log('1');
    
    if(req.body.email)  {
        console.log('2');
        await sendOtp(req.body.email)

        res.status(200).json({
            "message": "OTP Sent Sucessfully"
        })
    }
}

// Forget Password
const forgetPassword = async (req, res) => {
    if(req.body.email && req.body.otp && req.body.newPassword)    {

        const redisOtp = await redisMethods.getOtp(req.body.email)

        if(req.body.otp == redisOtp)    {
            const updatedUser = await User.findOneAndUpdate(
                {email: req.body.email},
                {password: req.body.newPassword},
                {new: true}
            )

            res.status(202).json({
                "message" : "Password Updated Sucessfully",
                updatedUser
            })
        }   else {
            res.status(401).json({
                "message" : "Invalid OTP",
            })
        }
    }   else    {
        res.status(404).json({
            "message" : "Incomplete Details",
        })
    }
}

// OTP Verification
const otp = async (req, res) => {

    try {
        const decoded = jwt.verify(req.body.token, process.env.JWT_SECRET)

        if(decoded.email == req.body.email)    {

            const redisOtp = await redisMethods.getOtp(req.body.email)

            if(req.body.otp == redisOtp)    {

                const updatedUser = await User.findOneAndUpdate(
                    {email: req.body.email},
                    {isVerified: true},
                    {new: true,}
                )

                res.status(200).json({
                    "message" : "Otp Verified Sucessfully",
                })
            }   else {
                res.status(401).json({
                    "message" : "Invalid OTP",
                })
            }

        }   else    {
            res.status(401).json({
                "message" : "Invalid Email",
            })
        }

    } catch (error) {
        if(error.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "JWT expired"
            })
        }

        if(error.name === "JsonWebTokenError") {
            return res.status(401).json({
                message: "Invalid token"
            })
        }

        return res.status(501).json({
            "message" : "Internal Server Error",
            message: error.message
        })
    }
}

// Resend OTP
const resendOtp = async (req, res) => {
    await sendOtp(req.body.email)
    res.status(200).json({
        "message" : "OTP Resent Sucessfull",
    })
}

const authController = {
    signup,
    signin,
    forgetPasswordOtp,
    forgetPassword,
    otp,
    resendOtp
}

export default authController
