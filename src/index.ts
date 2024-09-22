import bodyParser from 'body-parser';
import express from 'express';
import {Request,Response} from 'express'
import db from './config/db'
const cors = require('cors')
import userRouter from '../src/router/user'
import adminRouter from '../src/router/admin'
import config from './config/constant'
const app = express();
app.use(cors({ origin: ['http://localhost:5173','https://64de7e04c4b2ef124e393b4c--polite-monstera-043144.netlify.app','http://localhost:3000'], optionsSuccessStatus: 200 }));

app.options("*", cors({ origin: ['http://localhost:5173','https://64de7e04c4b2ef124e393b4c--polite-monstera-043144.netlify.app','http://localhost:3000'], optionsSuccessStatus: 200 }));

app.use(express.urlencoded({extended:false}))
app.use(express.json())

app.get('/', (req:Request, res:Response) => {
    res.send('Server working.....');
})

app.use("/api/user",userRouter)
app.use("/api/admin",adminRouter)

app.listen( config.src.PORT, () => {
    console.log(`The application is listening on port ${config.src.PORT}`);
})