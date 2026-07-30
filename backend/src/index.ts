import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import emailRoutes from './routes/email';
import { runReconciler } from './workers/reconciler';
import './workers/jobProcessor'; // Import to start the worker

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/emails', emailRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Run reconciler on startup, then start server
runReconciler().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
