// @ts-check
import https from 'node:https';

const HOST = 'www.eldeskops.com';
const KEY = '81a1f37f2a254962c7518465c4452477';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const URLS = [
  `https://${HOST}/`,
  `https://${HOST}/calculadora-ergonomica`,
  `https://${HOST}/guias/black-friday-setups-ergonomia`,
  `https://${HOST}/guias/sihoo-m18-vs-ticova-respaldo-alto`,
  `https://${HOST}/sitemap-index.xml`
];

const payload = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList: URLS
});

console.log('Enviando solicitud de indexacion instantanea a IndexNow (Bing, Yandex, Seznam)...');
console.log('URLs:', URLS);

const req = https.request(
  {
    hostname: 'api.indexnow.org',
    path: '/indexnow',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload)
    }
  },
  (res) => {
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    res.on('end', () => {
      if (res.statusCode === 200 || res.statusCode === 202) {
        console.log(`[OK] Solicitud aceptada por IndexNow (HTTP ${res.statusCode}). Los buscadores compatibles estan rastreando las URLs.`);
      } else {
        console.log(`[AVISO] Respuesta de IndexNow: HTTP ${res.statusCode} ${res.statusMessage}`);
        if (responseData) console.log(responseData);
      }
    });
  }
);

req.on('error', (err) => {
  console.error('[ERROR] Error al contactar IndexNow:', err.message);
});

req.write(payload);
req.end();
