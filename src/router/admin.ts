import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import db from "../config/db";
import jwt from "jsonwebtoken";
import config from "../config/constant";
import { Admin } from "../interface/interface";
import { body,param, validationResult } from 'express-validator';
import authMiddleware from "../middleware/auth";


const router = express.Router();

const registrationValidator = [
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
]

const loginValidator = [ 
    body('email').isEmail().withMessage('A valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
]

const adminUuidDetailsValidator = [
    param('adminId').isUUID().withMessage('Invalid admin ID format'), // Validate that adminId is a UUID
]

// Register a new admin
router.post("/register",registrationValidator, async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, email, password }:Admin = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).send({
            status: "error",
            data: {},
            message: errors.array()
        });
    }

    // Check if the admin email already exists
    const existingUser = await db.query(
      "SELECT * FROM admins WHERE email = $1",
      [email]
    );
   
    // Check if the user already exists
    if (existingUser.rowCount > 0) {
      return res.status(400).send({
        status: "error",
        data: {},
        message: "Admin already exists with the same email",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new admin
    const newAdminModel = {
      first_name,
      last_name,
      email,
      password: hashedPassword,
    };

    const adminUuid = await db.query(
      "INSERT INTO admins (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING uuid",
      [
        newAdminModel.first_name,
        newAdminModel.last_name,
        newAdminModel.email,
        newAdminModel.password,
      ]
    );

    const roleQuery = await db.query(" SELECT * FROM  roles");

    for (let role of roleQuery.rows) {
      if (role.title == 'admin') {
        let roleModel = await db.query(
          "INSERT INTO user_role (user_uuid,role_uuid) VALUES ($1, $2 )",
          [adminUuid.rows[0].uuid, role.uuid]
        );
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login
router.post("/login",loginValidator, async (req: Request, res: Response) => {
  try {
    const { email, password } : { email: string; password: string } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).send({
            status: "error",
            data: {},
            message: errors.array()
        });
    }

    // Find the admin by email
    const admin = await db.query("SELECT * FROM admins WHERE email = $1", [
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
    const passwordMatch = await bcrypt.compare(password, admin.rows[0].password);

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
    const role = await db.query(roleQuery, [admin.rows[0].uuid]);

    // Check if any roles were found
    if (role.rowCount === 0) {
      return res.status(404).send({
        status: "error",
        data: {},
        message: "No role found for this user",
      });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { userId: admin.rows[0].uuid, role: role.rows[0].title },
      config.src.SECRET_KEY as string
    );

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get admin by ID
router.get("/:adminId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const adminId = req.params.adminId;

    // Check if the admin email already exists
    const existingAdmin = await db.query("SELECT * FROM admins WHERE uuid = $1", [
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

    const userResponseDetails = existingAdmin.rows[0]

    delete userResponseDetails.password

    res.status(200).json({
      status: "success",
      data: existingAdmin.rows[0],
      message: "Admin retrieved successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
