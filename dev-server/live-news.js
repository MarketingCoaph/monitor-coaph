import { MonitorPipeline } from '../monitor/pipeline.js';

function send(response, status, payload) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(payload));
}

export function liveNewsPlugin(options = {}) {
  const pipeline = new MonitorPipeline(options);
  return {
    name: 'monitor-coaph-live-news',
    configureServer(server) {
      server.middlewares.use('/api/live-news', async (_request, response) => {
        try {
          const result = await pipeline.run();
          send(response, 200, { success: true, data: { items: result.items, run: result.run, provider_status: result.provider_status } });
        } catch (error) { send(response, 502, { success: false, message: `Falha na varredura: ${error.message}` }); }
      });
      server.middlewares.use('/api/monitor-status', (_request, response) => {
        send(response, 200, { success: true, data: pipeline.status() });
      });
      server.middlewares.use('/api/monitor-run', async (request, response) => {
        if (request.method !== 'POST') return send(response, 405, { success: false, message: 'Use POST.' });
        try {
          const result = await pipeline.run({ force: true });
          send(response, 200, { success: true, data: { items: result.items, run: result.run, provider_status: result.provider_status } });
        } catch (error) { send(response, 502, { success: false, message: `Falha na varredura: ${error.message}` }); }
      });
    },
  };
}
