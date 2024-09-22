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
const adminUuidDetailsValidator = [
    (0, express_validator_1.param)('adminId').isUUID().withMessage('Invalid admin ID format'), // Validate that adminId is a UUID
];
// Register a new admin
router.post("/register", registrationValidator, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { first_name, last_name, email, password } = req.body;
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).send({
                status: "error",
                data: {},
                message: errors.array()
            });
        }
        // Check if the admin email already exists
        const existingUser = yield db_1.default.query("SELECT * FROM admins WHERE email = $1", [email]);
        // Check if the user already exists
        if (existingUser.rowCount > 0) {
            return res.status(400).send({
                status: "error",
                data: {},
                message: "Admin already exists with the same email",
            });
        }
        // Hash the password
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Create a new admin
        const newAdminModel = {
            first_name,
            last_name,
            email,
            password: hashedPassword,
        };
        const adminUuid = yield db_1.default.query("INSERT INTO admins (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING uuid", [
            newAdminModel.first_name,
            newAdminModel.last_name,
            newAdminModel.email,
            newAdminModel.password,
        ]);
        const roleQuery = yield db_1.default.query(" SELECT * FROM  roles");
        for (let role of roleQuery.rows) {
            if (role.title == 'admin') {
                let roleModel = yield db_1.default.query("INSERT INTO user_role (user_uuid,role_uuid) VALUES ($1, $2 )", [adminUuid.rows[0].uuid, role.uuid]);
            }
        }
        res.status(201).send({
            status: "success",
            data: {
                first_name: newAdminModel.first_name,
                last_name: newAdminModel.last_name,
                email: newAdminModel.email,
            },
            message: "Admin registered successfully",
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
        // Find the admin by email
        const admin = yield db_1.default.query("SELECT * FROM admins WHERE email = $1", [
            email,
        ]);
        if (admin.rowCount == 0) {
            return res.status(404).send({
                status: "error",
                data: {},
                message: "Invalid email, please register first",
            });
        }
        // Compare passwords
        const passwordMatch = yield bcrypt_1.default.compare(password, admin.rows[0].password);
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
        const role = yield db_1.default.query(roleQuery, [admin.rows[0].uuid]);
        // Check if any roles were found
        if (role.rowCount === 0) {
            return res.status(404).send({
                status: "error",
                data: {},
                message: "No role found for this user",
            });
        }
        // Generate a JWT token
        const token = jsonwebtoken_1.default.sign({ userId: admin.rows[0].uuid, role: role.rows[0].title }, constant_1.default.src.SECRET_KEY);
        res.status(200).send({
            status: "success",
            data: {
                userId: admin.rows[0].uuid,
                email: admin.rows[0].email,
                role: role.rows[0].title,
                token,
            },
            message: "Admin Login successful",
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Get admin by ID
router.get("/:adminId", auth_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const adminId = req.params.adminId;
        // Check if the admin email already exists
        const existingAdmin = yield db_1.default.query("SELECT * FROM admins WHERE uuid = $1", [
            adminId,
        ]);
        // Check if the user already exists
        if (existingAdmin.rowCount == 0) {
            return res.status(400).send({
                status: "error",
                data: {},
                message: "User not exist with given credential",
            });
        }
        const userResponseDetails = existingAdmin.rows[0];
        delete userResponseDetails.password;
        res.status(200).json({
            status: "success",
            data: existingAdmin.rows[0],
            message: "Admin retrieved successfully",
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
exports.default = router;
