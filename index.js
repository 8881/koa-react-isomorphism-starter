const cluster = require('cluster');
const path = require('path');
const open = require('open');
const watch = require('watch');

const PORT = process.env.PORT || 9000;

const server_path = path.join(__dirname, '/server');

let opened = false;

if (process.env.NODE_ENV === undefined) {
  process.env.NODE_ENV = 'development';
}

const clusterFork = (workerName) => {
  const worker = cluster.fork({
    worker: workerName
  });
  worker.on('exit', () => clusterFork(workerName));
  return worker;
};

if (process.env.NODE_ENV === 'development') {
  if (cluster.isMaster) {
    console.log('[master]');
    // 单开客户端 webpack server 进程
    const webpack = clusterFork('webpack');
    let server;
    webpack.on('message', msg => {
      // 客户端编译完成后启动服务端
      if (msg === 'webpack is ready' || msg === 'file changed') {
        if (!server || server.isDead()) {
          server = clusterFork('server');
          // console.log(server.process.pid);
        }
      }
    })
  } else if (process.env.worker === 'webpack') {
    const pid = cluster.worker.process.pid;
    console.log(`[worker ${pid}] webpack`);
    // 模拟webpack编译完成或者文件变化时通知master
    if (Math.random() < 0.5) {
      process.send('webpack is ready');
    } else {
      process.send('file changed');
    }
  } else if (process.env.worker === 'server') {
    const pid = cluster.worker.process.pid;
    console.log(`[worker ${pid}] server`);
    require('babel-core/register');
    const server = require('./server').default;

    server.listen(PORT, () => {
      const url = `http://localhost:${PORT}`;
      if (!opened) {
        opened = true;
        open(url);
      }
      console.log(`[server] ${url}`);
    });

    // server文件变化自动杀掉并重启server进程
    watch.createMonitor(server_path, monitor => {
      monitor.on('changed', () => {
        console.log('[restart] file changed.');
        process.kill(pid);
      })
    });
  }
} else {
  console.log('[production]');
}
