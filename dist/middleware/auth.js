"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../config/db"));
const constant_1 = __importDefault(require("../config/constant"));
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        const decodedToken = jsonwebtoken_1.default.verify(token, constant_1.default.src.SECRET_KEY);
        let details;
        if (decodedToken.role == 'user') {
            details = `
      SELECT * 
      FROM users as u
      LEFT JOIN user_role ur ON u.uuid = ur.user_uuid
      LEFT JOIN roles r ON ur.role_uuid = r.uuid
      WHERE u.uuid = $1
    `;
        }
        else if (decodedToken.role == 'admin') {
            details = `
      SELECT * 
      FROM admins as a
      LEFT JOIN user_role ur ON a.uuid = ur.user_uuid
      LEFT JOIN roles r ON ur.role_uuid = r.uuid
      WHERE u.uuid = $1
    `;
        }
        const rows = yield db_1.default.query(details, [decodedToken.userId]);
        if (rows.rowCount === 0) {
            return res.status(401).json({ message: 'Authentication failed' });
        }
        const user = rows.rows;
        req = user;
        if (user[0].title !== 'admin' && user[0].title !== 'user') {
            return res.status(403).json({ message: 'Invalid user role' });
        }
        next();
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ message: 'Invalid token' });
    }
});
exports.default = authMiddleware;
