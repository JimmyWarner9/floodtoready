import express from 'express';
import { createWeatherHandler } from './weather.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { createHttpBoundary } from './http-boundary.js';
import { securityHeadersMiddleware } from './server-security.js';
import { createProviderStatusHandler } from './public-provider-status.js';

export function createApplication() {
  const boundary = createHttpBoundary({
    bootstrap: (_req, res) => { res.json({ mode: 'official-sources', sourceUrl: 'https://portalbencana.nadma.gov.my/en/' }); },
    agencies: (_req, res) => { res.json([{ name: 'Emergency', telephone: '999' }, { name: 'NADMA NDCC', telephone: '03-8064 2400' }, { name: 'METMalaysia', telephone: '1-300-22-1638' }]); },
    situation: (_req, res) => { res.json({ rainfall: [], rivers: [], warnings: [], available: false, sourceUrl: 'https://publicinfobanjir.water.gov.my/' }); },
    chat: (_req, res) => { res.status(410).json({ unavailable: true, message: 'Use the source-linked guidance assistant in the application.' }); },
    source: (_req, res) => {
      res.status(410).json({ unavailable: true });
    },
    status: createProviderStatusHandler(),
  });
  const assets = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../web/dist');
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeadersMiddleware);
  app.get('/api/weather', createWeatherHandler());
  app.use(express.static(assets));
  app.get('*', (req, res, next) => { if (req.path.startsWith('/api/')) { next(); return; } res.sendFile(resolve(assets, 'index.html')); });
  app.use(boundary);
  return app;
}


