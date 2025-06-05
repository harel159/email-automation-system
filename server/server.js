// File: server.js
import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import dotenv from 'dotenv';

import clientRoutes from './routes/clientRoutes.js';
import emailRoutes from './routes/emailRoutes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use('/uploads', express.static('uploads'));
app.use('/attachments', express.static('attachments'));

app.use('/api/clients', clientRoutes);
app.use('/api/email', emailRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '127.0.0.1', () => console.log(`Server running on port ${PORT} only LOCALHOST`));
