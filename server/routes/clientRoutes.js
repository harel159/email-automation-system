// server/routes/clientRoutes.js
import express from 'express';
import {
  getAllAuthorities,
  createAuthority,
  updateAuthority,
  deleteAuthority,
} from '../controllers/clientController.js';

const router = express.Router();

router.get('/', getAllAuthorities);
router.post('/', createAuthority);
router.put('/:id', updateAuthority);
router.delete('/:id', deleteAuthority);

export default router;
