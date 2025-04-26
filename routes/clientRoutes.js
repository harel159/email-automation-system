import express from 'express';
import {
  getAllAuthorities, // ✅ import the new function
} from '../controllers/clientController.js';

const router = express.Router();


router.get('/', getAllAuthorities); // ✅ this handles GET /api/clients

export default router;
