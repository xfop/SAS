import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import scheduleRouter from './routes/schedule.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
var PORT = process.env.PORT || 3001;

// allow all origins for development
app.use(cors());
app.use(express.json());

// api routes
app.use('/api', scheduleRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// serve static files in production
// put client build files in server/public folder
var staticPath = join(__dirname, '..', 'public');
app.use(express.static(staticPath));

// fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(join(staticPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log('server running on port', PORT);
});
