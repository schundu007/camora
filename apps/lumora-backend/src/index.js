import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://lumora.cariara.com',
    'https://capra.cariara.com',
  ],
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'lumora-backend', version: '2.0.0' });
});

app.get('/', (req, res) => {
  res.json({ name: 'Lumora Backend', version: '2.0.0' });
});

// Routes will be added as features are migrated
// import authRouter from './routes/auth.js';
// app.use('/api/v1/auth', authRouter);

app.listen(PORT, () => {
  console.log(`Lumora backend running on port ${PORT}`);
});

export default app;
