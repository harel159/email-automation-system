// server/routes/clientRoutes.js
import express from 'express';
import {
  getAllAuthorities,
  createAuthority,
  updateAuthority,
  deleteAuthority,
} from '../controllers/clientController.js';

const router = express.Router();
// testable path (explicit)
router.get('/__list', getAllAuthorities);

// main list route used by the UI
router.get('/', getAllAuthorities);
router.post('/', createAuthority);
router.put('/:id', updateAuthority);
router.delete('/:id', deleteAuthority);

export default router;
