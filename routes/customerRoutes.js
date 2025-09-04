// server/routes/customerRoutes.js
import express from 'express';
import { getAllCustomers } from '../controllers/customerController.js';

const router = express.Router();
router.get('/', getAllCustomers);

export default router;
