import express, { Request, Response } from "express";
import bcrypt from "bcrypt";
import db from "../config/db";
import jwt from "jsonwebtoken";
import config from "../config/constant";
import { User } from "../interface/interface";
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

const userUuidDetailsValidator = [
    param('userId').isUUID().withMessage('Invalid user ID format'), // Validate that userId is a UUID
]

// Register a new user
router.post("/register",registrationValidator, async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, email, password}:User = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).send({
            status: "error",
            data: {},
            message: errors.array()
        });
    }

    // Check if the username already exists
    const existingUser = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
   
    // Check if the user already exists
    if (existingUser.rowCount > 0) {
      return res.status(400).send({
        status: "error",
        data: {},
        message: "User already exists with the same email",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUserModel = {
      first_name,
      last_name,
      email,
      password: hashedPassword,
    };

    const userUuid = await db.query(
      "INSERT INTO users (first_name, last_name, email, password) VALUES ($1, $2, $3, $4) RETURNING uuid",
      [
        newUserModel.first_name,
        newUserModel.last_name,
        newUserModel.email,
        newUserModel.password,
      ]
    );

    const roleQuery = await db.query(" SELECT * FROM  roles");

    for (let role of roleQuery.rows) {
      if (role.title == 'user') {
        let roleModel = await db.query(
          "INSERT INTO user_role (user_uuid,role_uuid) VALUES ($1, $2 )",
          [userUuid.rows[0].uuid, role.uuid]
        );
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

    // Find the user by username
    const user = await db.query("SELECT * FROM users WHERE email = $1", [
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
    const passwordMatch = await bcrypt.compare(password, user.rows[0].password);

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
    const role = await db.query(roleQuery, [user.rows[0].uuid]);

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
      { userId: user.rows[0].uuid, role: role.rows[0].title },
      config.src.SECRET_KEY as string
    );

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get user by ID
router.get("/:userId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Check if the username already exists
    const existingUser = await db.query("SELECT * FROM users WHERE uuid = $1", [
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

    const userResponseDetails = existingUser.rows[0]

    delete userResponseDetails.password

    res.status(200).json({
      status: "success",
      data: existingUser.rows[0],
      message: "User retrieved successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
