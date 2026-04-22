import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

async function startServer() {
  // --- Middleware ---
  app.use(cors());
  app.use(express.json({ limit: '50mb' })); // Support large payloads

  // --- File Storage Configuration ---
  const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  const DATA_FILE = path.join(DATA_DIR, 'workspace.json');

  // Ensure data directory exists
  if (!fsSync.existsSync(DATA_DIR)) {
    fsSync.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`[Storage] Created data directory at ${DATA_DIR}`);
  }

  // Helper: Initialize or Read Data
  const readData = async () => {
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return {}; 
      }
      throw error;
    }
  };

  const writeData = async (data: any) => {
    const tempFile = `${DATA_FILE}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tempFile, DATA_FILE);
  };

  // Request Logger
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API Request] ${req.method} ${req.url}`);
    }
    next();
  });

  // --- API Endpoints ---
  app.get('/api/workspace', async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      const data = await readData();
      res.json(data);
    } catch (err: any) {
      console.error("GET /api/workspace Error:", err);
      res.status(500).json({ error: 'Failed to read server storage', details: err.message });
    }
  });

  app.post('/api/workspace', async (req, res) => {
    try {
      const { data } = req.body;
      if (!data) return res.status(400).json({ error: 'No data provided' });
      
      await writeData(data);
      
      console.log(`[Storage] Saved ${JSON.stringify(data).length} bytes to ${DATA_FILE}`);
      res.json({ success: true });
    } catch (err: any) {
      console.error("POST /api/workspace Error:", err);
      res.status(500).json({ error: 'Failed to write to server storage', details: err.message });
    }
  });

  app.delete('/api/workspace', async (req, res) => {
    try {
      console.log(`[Storage] Attempting to delete data file at ${DATA_FILE}`);
      if (fsSync.existsSync(DATA_FILE)) {
        // Overwrite with empty object first to ensure content is gone
        await fs.writeFile(DATA_FILE, '{}', 'utf8');
        await fs.unlink(DATA_FILE);
        console.log(`[Storage] Successfully deleted data file at ${DATA_FILE}`);
      } else {
        console.log(`[Storage] Data file did not exist at ${DATA_FILE}, nothing to delete.`);
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("DELETE /api/workspace Error:", err);
      res.status(500).json({ error: 'Failed to delete server storage', details: err.message });
    }
  });

  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  // --- Vite Middleware or Static Files ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Data Source: ${DATA_FILE}`);
  });
}

startServer();
