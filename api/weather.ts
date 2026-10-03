import { createWeatherHandler } from '../apps/server/src/weather.js';

// Reuse the validated weather adapter used by the local Node server.
export default createWeatherHandler();
