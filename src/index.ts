import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import { invoiceRouter } from './routes/invoices';
import { foodCostRouter } from './routes/foodCost';
import { simulateurRouter } from './routes/simulateur';
import { opsRouter } from './routes/ops';
import { adminRouter } from './routes/admin';
import { carteRouter } from './routes/carte';
import { importRouter } from './routes/import';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'nourria-api', version: '0.1.0', timestamp: new Date().toISOString() });
});

app.use('/api/v1/invoices', invoiceRouter);
app.use('/api/v1/food-cost', foodCostRouter);
app.use('/api/v1/simulateur', simulateurRouter);
app.use('/api/v1/ops', opsRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/carte', carteRouter);
app.use('/api/v1/import', importRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ NourrIA API démarrée sur http://localhost:${PORT}`);
});

export default app;
