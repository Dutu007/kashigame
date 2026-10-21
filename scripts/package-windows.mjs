import { cp, copyFile, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

// 把 dist/ 打成 Windows 免安装包：内置 Node 运行时 + 本地服务 + 启动脚本。
// 用法：node scripts/package-windows.mjs [--zip] [--out=<目录>]

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const distDir = join(rootDir, 'dist');
const packagingDir = join(rootDir, 'packaging');
const args = process.argv.slice(2);
const outArg = args.find(arg => arg.startsWith('--out='));
const outDir = outArg ? join(rootDir, outArg.slice('--out='.length)) : join(rootDir, 'release', 'kashigame-win');
const wantZip = args.includes('--zip');

async function dirSize(dir) {
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = join(dir, entry.name);
    if (entry.isDirectory()) total += await dirSize(target);
    else total += (await stat(target)).size;
  }
  return total;
}

if (!existsSync(join(distDir, 'index.html'))) {
  console.error('没有找到 dist/index.html，请先执行 npm run build。');
  process.exit(1);
}

console.log('清理输出目录：' + outDir);
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

console.log('复制构建产物 dist/ → app/');
await cp(distDir, join(outDir, 'app'), { recursive: true });

console.log('复制 Node 运行时：' + process.execPath);
await mkdir(join(outDir, 'runtime'), { recursive: true });
await copyFile(process.execPath, join(outDir, 'runtime', 'node.exe'));

for (const name of ['server.mjs', '启动游戏.bat', '关闭游戏.bat']) {
  await copyFile(join(packagingDir, name), join(outDir, name));
}

const readme = `喀什小镇 · Windows 免安装版

启动方式
  双击「启动游戏.bat」，会打开默认浏览器进入游戏。
  首次启动如果弹出网络/防火墙提示，请允许本地访问（只监听 127.0.0.1）。

关闭方式
  双击「关闭游戏.bat」，或关闭任务栏里最小化的 "Kashgar Game Server" 窗口。

说明
  - 免安装，不需要 Node.js 或 Python，所有文件都在本目录内。
  - app/ 是游戏本体，runtime/ 是内置运行时，请勿单独移动。
  - 存档保存在浏览器的 localStorage 中，换浏览器或清缓存会丢失进度。
  - 进入第一关会播放片头视频，按空格 / 回车 / Esc 或点右下角按钮可跳过。
`;
await writeFile(join(outDir, '使用说明.txt'), '\ufeff' + readme.replace(/\n/g, '\r\n'), 'utf8');

const totalBytes = await dirSize(outDir);
console.log(`完成：${outDir}`);
console.log(`体积：${(totalBytes / 1024 / 1024).toFixed(1)} MB`);

if (wantZip) {
  const zipPath = outDir + '.zip';
  console.log('压缩为 ' + zipPath + '（稍等）');
  // Compress-Archive 写入 UTF-8 文件名标记，资源管理器解压中文文件名不会乱码。
  const quote = value => "'" + value.replace(/'/g, "''") + "'";
  execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command',
    `Compress-Archive -Path ${quote(outDir)} -DestinationPath ${quote(zipPath)} -CompressionLevel Fastest -Force`],
  { stdio: 'inherit' });
  console.log(`压缩完成：${zipPath}（${((await stat(zipPath)).size / 1024 / 1024).toFixed(1)} MB）`);
}
