const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { WebSocket } = require('ws');

const PORT = 3000;

// ─── ID → altın eşleştirmesi ──────────────────────────────────────────────
const GOLD_IDS = {
  176: 'gram',
  152: 'ceyrek',
  154: 'yarim',
  156: 'tam',
  129: 'ons',
  160: 'cumhuriyet'
};

// Döviz ID'leri (hakanaltin websocket'ten)
const CURRENCY_IDS = {
  113: 'usd',   // USD/TRY
  114: 'eur',   // EUR/TRY
  115: 'gbp',   // GBP/TRY
};

// ─── Canlı fiyat deposu ───────────────────────────────────────────────────
const prices = {};

// ─── hakanaltin WebSocket bağlantısı ─────────────────────────────────────
function connectWS() {
  const ws = new WebSocket('wss://websocket.hakanaltin.com/');

  ws.on('open', () => {
    console.log('✅ hakanaltin WebSocket bağlandı');
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'keepalive') return;
      const { i, b, a } = msg;
      if (GOLD_IDS[i]) {
        prices[GOLD_IDS[i]] = { buying: b, selling: a, updated: Date.now() };
      }
      if (CURRENCY_IDS[i]) {
        prices[CURRENCY_IDS[i]] = { buying: b, selling: a, updated: Date.now() };
      }
    } catch(e) {}
  });

  ws.on('close', () => {
    console.log('⚠ WebSocket kapandı, 3 saniye sonra yeniden bağlanıyor...');
    setTimeout(connectWS, 3000);
  });

  ws.on('error', (err) => {
    console.error('WebSocket hatası:', err.message);
    ws.terminate();
  });
}

connectWS();

// ─── HTTP Server ──────────────────────────────────────────────────────────
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

server.listen(PORT, () => {
  console.log(`✅ Altın Takip sunucusu çalışıyor: http://localhost:${PORT}`);
});
