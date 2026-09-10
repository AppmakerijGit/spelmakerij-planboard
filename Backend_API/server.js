import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pool from './db.js';
import authRouter from './routes/auth.js';
import cardsRouter from './routes/cards.js';
import absencesRouter from './routes/absences.js';
import accountsRouter from './routes/accounts.js';
import builderDataRouter from './routes/builderData.js';
import slotTimesRouter from './routes/slotTimes.js';

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5186,https://localhost:7114')
  .split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/auth', authRouter);
app.use('/cards', cardsRouter);
app.use('/absences', absencesRouter);
app.use('/accounts', accountsRouter);
app.use('/builder-data', builderDataRouter);
app.use('/slot-times', slotTimesRouter);

// Verify DB connection on startup
try {
  const conn = await pool.getConnection();
  conn.release();
  console.log('Database connection established.');
} catch (err) {
  console.error('Failed to connect to the database:', err.message);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
