const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocket, WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;

const GOLD_IDS = { 176:'gram', 152:'ceyrek', 154:'yarim', 156:'tam', 129:'ons', 160:'cumhuriyet' };
const CURRENCY_IDS = { 113:'usd', 114:'eur', 115:'gbp' };

const prices = {};

// ─── Tarayıcılara yayın yapacak WebSocket sunucusu ───────────────────────
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/' || req.url === '/index.html') {
    const file = fs.readFileSync(path.join(__dirname, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(file);
  }
  if (req.url === '/api/prices') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, prices }));
  }
  res.writeHead(404);
  res.end('Not found');
});

// Tarayıcı WebSocket sunucusu (aynı port, /ws path)
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('🌐 Tarayıcı bağlandı');
  // Bağlanınca mevcut fiyatları hemen gönder
  ws.send(JSON.stringify({ type: 'init', prices }));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// ─── hakanaltin WebSocket bağlantısı ─────────────────────────────────────
function connectWS() {
  const ws = new WebSocket('wss://websocket.hakanaltin.com/');

  ws.on('open', () => console.log('✅ hakanaltin WebSocket bağlandı'));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'keepalive') return;
      const { i, b, a } = msg;
      let updated = false;
      if (GOLD_IDS[i]) {
        prices[GOLD_IDS[i]] = { buying: b, selling: a, updated: Date.now() };
        updated = true;
      }
      if (CURRENCY_IDS[i]) {
        prices[CURRENCY_IDS[i]] = { buying: b, selling: a, updated: Date.now() };
        updated = true;
      }
      // Değişikliği tarayıcılara anlık ilet
      if (updated) broadcast({ type: 'update', prices });
    } catch(e) {}
  });

  ws.on('close', () => {
    console.log('⚠ WebSocket kapandı, 3 saniye sonra yeniden bağlanıyor...');
    setTimeout(connectWS, 3000);
  });

  ws.on('error', (err) => { console.error('WebSocket hatası:', err.message); ws.terminate(); });
}

connectWS();

server.listen(PORT, () => console.log(`✅ Euro Gold sunucusu çalışıyor: http://localhost:${PORT}`));
