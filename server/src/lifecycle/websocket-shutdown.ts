import type { WebSocketServer } from 'ws';

/** Drain every upgrade path owned by the standalone API, including tracking. */
export async function closeWebSocketServers(servers: WebSocketServer[]): Promise<void> {
  await Promise.all(servers.map(async server => {
    for (const client of server.clients) {
      try { client.close(1001, 'Server shutting down'); }
      catch { client.terminate(); }
    }
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }));
}
