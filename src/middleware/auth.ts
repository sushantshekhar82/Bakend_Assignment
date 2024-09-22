import {Response,Request, NextFunction} from 'express'
import jwt from 'jsonwebtoken'
import db from '../config/db'
import config from '../config/constant'

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
   

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decodedToken:any = jwt.verify(token,config.src.SECRET_KEY as string);

    let details ;
    if(decodedToken.role == 'user'){

      details = `
      SELECT * 
      FROM users as u
      LEFT JOIN user_role ur ON u.uuid = ur.user_uuid
      LEFT JOIN roles r ON ur.role_uuid = r.uuid
      WHERE u.uuid = $1
    `;

    }else if(decodedToken.role == 'admin'){

      details = `
      SELECT * 
      FROM admins as a
      LEFT JOIN user_role ur ON a.uuid = ur.user_uuid
      LEFT JOIN roles r ON ur.role_uuid = r.uuid
      WHERE u.uuid = $1
    `;

    }

    const rows = await db.query(details, [decodedToken.userId]);

    if (rows.rowCount === 0) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    const user = rows.rows;
    req = user;

    if (user[0].title !== 'admin' && user[0].title !== 'user') {
      return res.status(403).json({ message: 'Invalid user role' });
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Invalid token' });
  }
};

export default authMiddleware;

