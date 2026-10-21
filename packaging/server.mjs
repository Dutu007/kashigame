// 打包后的 Windows 版内置的本地静态服务：
// 只读取同目录下的 app/，自动选择可用端口，并在启动后打开默认浏览器。
import { createReadStream, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, sep } from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./app/', import.meta.url));
const infoFile = fileURLToPath(new URL('./.server-info.json', import.meta.url));
const args = process.argv.slice(2);
const noOpen = args.includes('--no-open');
const wanted = Number((args.find(arg => arg.startsWith('--port=')) || '').slice('--port='.length)) || 8099;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

function send(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (_) {
    send(res, 400, 'Bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = join(root, pathname);
  if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) {
    send(res, 403, 'Forbidden');
    return;
  }

  let stat;
  try {
    stat = statSync(file);
  } catch (_) {
    send(res, 404, 'Not found');
    return;
  }
  if (!stat.isFile()) {
    send(res, 404, 'Not found');
    return;
  }

  const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
  const headers = { 'Content-Type': type, 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
  const range = req.headers.range;

  // Browsers request byte ranges for video/audio; without 206 the chapter opening
  // video still plays but cannot seek.
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      let end = match[2] ? Number(match[2]) : stat.size - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= stat.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        res.end();
        return;
      }
      end = Math.min(end, stat.size - 1);
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
      createReadStream(file, { start, end }).pipe(res);
      return;
    }
  }

  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  createReadStream(file).pipe(res);
});

let port = wanted;
function listen() {
  server.once('error', error => {
    if (error.code === 'EADDRINUSE' && port < wanted + 20) {
      port += 1;
      setTimeout(listen, 80);
      return;
    }
    console.error('无法启动本地服务：' + error.message);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${server.address().port}/`;
    try {
      writeFileSync(infoFile, JSON.stringify({ url, pid: process.pid }), 'utf8');
    } catch (_) {
      /* 关闭脚本只是可选的便利功能。 */
    }
    console.log(`喀什小镇已启动：${url}`);
    console.log('关闭游戏：双击「关闭游戏.bat」，或直接关闭这个窗口。');
    if (!noOpen) exec(`start "" "${url}"`, { shell: 'cmd.exe' });
  });
}
listen();
