import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/auth.js';
import { getAllUsers, updateUserInfo, updateUserRole, deleteUser } from '../controllers/adminController.js';

const router = express.Router();

router.use(verifyToken, authorizeRoles('admin'));

router.get('/users', getAllUsers);
router.put('/user/:id', updateUserInfo);
router.put('/user/:id/role', updateUserRole);
router.delete('/user/:id', deleteUser);

export default router;
