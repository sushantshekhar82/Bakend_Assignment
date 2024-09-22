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
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = __importDefault(require("../config/db"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const constant_1 = __importDefault(require("../config/constant"));
const express_validator_1 = require("express-validator");
const auth_1 = __importDefault(require("../middleware/auth"));
const router = express_1.default.Router();
const registrationValidator = [
    (0, express_validator_1.body)('first_name').notEmpty().withMessage('First name is required'),
    (0, express_validator_1.body)('last_name').notEmpty().withMessage('Last name is required'),
    (0, express_validator_1.body)('email').isEmail().withMessage('A valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];
const loginValidator = [
    (0, express_validator_1.body)('email').isEmail().withMessage('A valid email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];
const userUuidDetailsValidator = [
    (0, express_validator_1.param)('userId').isUUID().withMessage('Invalid user ID format'), // Validate that userId is a UUID
];
// Register a new user
router.post("/register", registrationValidator, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { first_name, last_name, email, password } = req.body;
        console.log("react calling", first_name, last_name, email, password);
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).send({
                status: "error",
                data: {},
                message: errors.array()
            });
        }
        // Check if the username already exists
        const existingUser = yield db_1.default.query("SELECT * FROM users WHERE email = $1", [email]);
        // Check if the user already exists
        if (existingUser.rowCount > 0) {
            return res.status(400).send({
                status: "error",
                data: {},
                message: "User already exists with the same email",
            });
        }
        // Hash the password
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Create a new user
        const newUserModel = {
            first_name,
            last_name,
            email,
            password: hashedPassword,
        };
        const userUuid = yield db_1.default.query("INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING uuid", [
            newUserModel.first_name,
            newUserModel.last_name,
            newUserModel.email,
            newUserModel.password,
        ]);
        const roleQuery = yield db_1.default.query(" SELECT * FROM  roles");
        for (let role of roleQuery.rows) {
            if (role.title == 'user') {
                let roleModel = yield db_1.default.query("INSERT INTO user_role (user_uuid,role_uuid) VALUES ($1, $2 )", [userUuid.rows[0].uuid, role.uuid]);
            }
        }
        res.status(201).send({
            status: "success",
            data: {
                first_name: newUserModel.first_name,
                last_name: newUserModel.last_name,
                email: newUserModel.email,
            },
            message: "User registered successfully",
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Login
router.post("/login", loginValidator, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).send({
                status: "error",
                data: {},
                message: errors.array()
            });
        }
        // Find the user by username
        const user = yield db_1.default.query("SELECT * FROM users WHERE email = $1", [
            email,
        ]);
        if (user.rowCount == 0) {
            return res.status(404).send({
                status: "error",
                data: {},
                message: "Invalid email, please register first",
            });
        }
        // Compare passwords
        const passwordMatch = yield bcrypt_1.default.compare(password, user.rows[0].password);
        if (!passwordMatch) {
            return res.status(401).send({
                status: "error",
                data: {},
                message: "Invalid password",
            });
        }
        const roleQuery = `
    SELECT r.*
    FROM user_role ur
    LEFT JOIN roles r ON r.uuid = ur.role_uuid
    WHERE ur.user_uuid = $1
    `;
        // Get user role
        const role = yield db_1.default.query(roleQuery, [user.rows[0].uuid]);
        // Check if any roles were found
        if (role.rowCount === 0) {
            return res.status(404).send({
                status: "error",
                data: {},
                message: "No role found for this user",
            });
        }
        // Generate a JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.rows[0].uuid, role: role.rows[0].title }, constant_1.default.src.SECRET_KEY);
        res.status(200).send({
            status: "success",
            data: {
                userId: user.rows[0].uuid,
                email: user.rows[0].email,
                role: role.rows[0].title,
                token,
            },
            message: "User Login successful",
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Get user by ID
router.get("/:userId", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.userId;
        // Check if the username already exists
        const existingUser = yield db_1.default.query("SELECT * FROM users WHERE uuid = $1", [
            userId,
        ]);
        // Check if the user already exists
        if (existingUser.rowCount == 0) {
            return res.status(400).send({
                status: "error",
                data: {},
                message: "User not exist with given credential",
            });
        }
        const userResponseDetails = existingUser.rows[0];
        delete userResponseDetails.password;
        res.status(200).json({
            status: "success",
            data: existingUser.rows[0],
            message: "User retrieved successfully",
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
exports.default = router;
