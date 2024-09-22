"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_1 = __importDefault(require("../src/router/user"));
const admin_1 = __importDefault(require("../src/router/admin"));
const constant_1 = __importDefault(require("./config/constant"));
const app = (0, express_1.default)();
app.use(express_1.default.urlencoded({ extended: false }));
app.use(express_1.default.json());
app.get('/', (req, res) => {
    res.send('Server working.....');
});
app.use("/api/user", user_1.default);
app.use("/api/admin", admin_1.default);
app.listen(constant_1.default.src.PORT, () => {
    console.log(`The application is listening on port ${constant_1.default.src.PORT}`);
});
