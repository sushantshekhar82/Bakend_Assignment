import dotenv from 'dotenv'

dotenv.config()

const constant ={

    src:{
        PORT: process.env.PORT,
        SECRET_KEY: process.env.SECRET_KEY 
    },
    database:{
        USER: process.env.USER,
        HOST: process.env.HOST,
        DATABASE: process.env.DATABASE,
        PASSWORD: process.env.PASSWORD,
        DATABASE_PORT: process.env.DATABASE_PORT

    }

}

export default constant