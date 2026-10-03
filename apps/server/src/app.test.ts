import { describe, expect, it } from 'vitest';
import supertest from 'supertest';
import { providerStatusResponseSchema } from '@banjir-ready/contracts';
import { createApplication } from './app.js';

describe('assembled public application', () => {
  it('serves the production page and a valid disabled-provider status', async () => {
    const app = createApplication();
    const page = await supertest(app).get('/');
    expect(page.status).toBe(200);
    expect(page.text).toContain('<div id="root">');
    const status = await supertest(app).get('/api/v1/status');
    expect(status.status).toBe(200);
    expect(providerStatusResponseSchema.safeParse(status.body).success).toBe(true);
  });
  it.each([['What emergency supplies should I prepare?', 'answer'], ['Help me I am trapped', 'emergency'], ['Predict when my home will flood', 'safety_fallback']])('handles %s', async (question) => {
    const result = await supertest(createApplication()).post('/api/v1/chat').send({ language: 'en', question, corpusVersion: 'corpus-v1' });
    expect(result.status).toBe(410);
    expect(result.body.unavailable).toBe(true);
  });
  it('rejects unknown request fields', async () => {
    const result = await supertest(createApplication()).post('/api/v1/chat').send({ language: 'en', question: 'supplies', corpusVersion: 'corpus-v1', unknown: true });
    expect(result.status).toBe(400);
  });
});

