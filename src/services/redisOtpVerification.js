import ConnectRedis from '../config/connectRedis.js'

const { client } = ConnectRedis;

const setOtp = async (otp, email) => {
    await client.set(
        email, otp,  {
            EX: 60
        }
    )
}

const getOtp = async (email) => {
    return await client.get(email)
}

const redisMethods = {
    setOtp,
    getOtp
}

export default redisMethods