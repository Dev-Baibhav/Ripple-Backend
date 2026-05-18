import { Resend } from "resend";
import { configDotenv } from "dotenv";
import rediMethods from "./redisOtpVerification.js";
import generateOtp from '../utils/otpGeneration.js';
configDotenv();

const resend = new Resend(process.env.RESEND_API);

const sendOtp = async (email) => {
    const otp = generateOtp()
    rediMethods.setOtp(otp, email)
    const { data, error } = await resend.emails.send({
        from: "Acme <onboarding@resend.dev>",
        to: [email],
        subject: "Ripple Verification",
        html: `<strong>Your Account Verification Code is ${otp}</strong>`,
    });

    if (error) {
        // return  error;
        console.log(`Resend Error: ${error.message}`);
        
    }
}

export default sendOtp