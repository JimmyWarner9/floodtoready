import { createApplication } from './app.js';
const port = Number(process.env['PORT'] ?? 3000);
createApplication().listen(port, '127.0.0.1', () => {
  console.log(`BanjirReady: http://127.0.0.1:${port}`);
});

