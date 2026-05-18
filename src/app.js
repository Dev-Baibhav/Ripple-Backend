import express from 'express'
import connectDB from './config/connectDB.js';
import router from './routes/authRouter.js';
import ConnectRedis from './config/connectRedis.js';

const app = express();
app.use(express.json());
connectDB();
ConnectRedis.connectRedis();

app.use('/api/auth', router);

app.get('/', (req, res) => {
    res.send('<h1>Hello World</h1>');
})

export default app;