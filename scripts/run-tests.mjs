import { startVitest } from 'vitest/node';
const context = await startVitest('test', process.argv.slice(2), { run: true, watch: false }, { configLoader: 'runner' });
if (!context) process.exitCode = 1;
else await context.close();
