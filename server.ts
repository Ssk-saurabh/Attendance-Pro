import express from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

import healthHandler from './api/health';
import checkEnvHandler from './api/check-env';
import parseSyllabusHandler from './api/parse-syllabus';
import parseTimetableHandler from './api/parse-timetable';
import extractSubjectsHandler from './api/extract-subjects';

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // API Routes
  app.get('/api/health', healthHandler);
  app.get('/api/check-env', checkEnvHandler);
  app.post('/api/parse-syllabus', upload.single('file'), parseSyllabusHandler);
  app.post('/api/parse-timetable', upload.single('file'), parseTimetableHandler);
  app.post('/api/extract-subjects', upload.single('file'), extractSubjectsHandler);

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
