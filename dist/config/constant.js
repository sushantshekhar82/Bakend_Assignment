"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const constant = {
    src: {
        PORT: process.env.PORT,
        SECRET_KEY: process.env.SECRET_KEY
    },
    database: {
        USER: process.env.USER,
        HOST: process.env.HOST,
        DATABASE: process.env.DATABASE,
        PASSWORD: process.env.PASSWORD,
        DATABASE_PORT: process.env.DATABASE_PORT
    }
};
exports.default = constant;
