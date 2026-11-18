
import net from 'node:net';

const TIMEOUT_MS = 4000;

// HTTP / HTTPS probe
async function httpProbe(host) {
  const url = host.startsWith('http://') || host.startsWith('https://')
    ? host
    : `https://${host}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow'
    });

    const latency = Date.now() - start;

    return {
      success: response.status >= 200 && response.status < 500,
      latency,
      output: `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      success: false,
      latency: null,
      output: error.message.slice(0, 300)
    };
  } finally {
    clearTimeout(timer);
  }
}

// TCP probe for IP addresses / hostnames
function tcpProbe(host, port = 443) {
  return new Promise(resolve => {
    const start = Date.now();
    const socket = new net.Socket();

    const finish = result => {
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(TIMEOUT_MS);

    socket.connect(port, host, () => {
      finish({
        success: true,
        latency: Date.now() - start,
        output: `TCP port ${port} connected`
      });
    });

    socket.on('timeout', () => {
      finish({
        success: false,
        latency: null,
        output: 'Connection timeout'
      });
    });

    socket.on('error', error => {
      finish({
        success: false,
        latency: null,
        output: error.message.slice(0, 300)
      });
    });
  });
}

export async function pingHost(host) {
  // URL targets use HTTP/HTTPS
  if (host.startsWith('http://') || host.startsWith('https://')) {
    return httpProbe(host);
  }

  // Hostnames use HTTPS; if it fails, try TCP
  const httpResult = await httpProbe(host);

  if (httpResult.success) {
    return httpResult;
  }

  return tcpProbe(host, 443);
}
