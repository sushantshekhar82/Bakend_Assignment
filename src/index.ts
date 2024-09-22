import bodyParser from 'body-parser';
import express from 'express';
import {Request,Response} from 'express'
import db from './config/db'
import userRouter from '../src/router/user'
import adminRouter from '../src/router/admin'
import config from './config/constant'
const app = express();

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