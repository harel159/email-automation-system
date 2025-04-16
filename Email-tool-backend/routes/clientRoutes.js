import express from 'express';
import {
  bulkCreateAuthorities,
  getAllAuthorities, // ✅ import the new function
} from '../controllers/clientController.js';

const router = express.Router();

router.post('/bulk-create', bulkCreateAuthorities);
router.get('/', getAllAuthorities); // ✅ this handles GET /api/clients

export default router;
