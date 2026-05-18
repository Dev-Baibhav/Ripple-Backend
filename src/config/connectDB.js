import mongoose from "mongoose"
import { configDotenv } from 'dotenv'
configDotenv()

export default function connectDB() {
    mongoose.connect(process.env.MONGO_DB)
    .then(value => {
        console.log('Connected to MongoDB')
        console.log(`Host: ${value.connection.host}`);
    }).catch(e => {
        console.log('Error connecting to MongoDB')
        console.log(`Message: ${e}`);
    })
}