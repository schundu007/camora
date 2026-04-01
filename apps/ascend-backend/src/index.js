import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3009;

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3001',
    'https://capra.cariara.com',
    'https://lumora.cariara.com',
  ],
  credentials: true,
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ascend-backend', version: '2.0.0' });
});

app.get('/', (req, res) => {
  res.json({ name: 'Ascend Backend', version: '2.0.0' });
});

app.listen(PORT, () => {
  console.log(`Ascend backend running on port ${PORT}`);
});

export default app;
