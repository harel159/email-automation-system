// File: server.js
import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import dotenv from 'dotenv';

import clientRoutes from './routes/clientRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use('/uploads', express.static('uploads'));
app.use('/attachments', express.static('attachments'));

app.use('/api/clients', clientRoutes);
app.use('/api/email', emailRoutes);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, '../client/dist');
console.log(clientDistPath.toString());

app.use(express.static(clientDistPath));

app.get('*',(req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).send('API route not found');
    }

    res?.sendFile(path.join(clientDistPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '127.0.0.1', () => console.log(`Server running on port ${PORT}`));
