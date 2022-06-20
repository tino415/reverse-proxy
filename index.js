#!/usr/bin/env node
const https = require('https')
const httpProxy = require('http-proxy')
const fs = require('fs')
const os = require('os')
const path = require('path')
const config_path = path.join(process.env.HOME, '/.reverse-proxy.json');

const {cert, key, cacert, port, routes} = JSON.parse(fs.readFileSync(config_path))

const httpsOptions = {
  key: fs.readFileSync(key),
  cert: fs.readFileSync(cert),
  ca: [fs.readFileSync(cacert)]
}

var proxy = httpProxy.createProxy()

proxy.on('error', error => {
  console.error(new Date(), 'Proxy error:', error)
})

proxy.on('open', value => {
  value.on('error', error => {
    console.error(new Date(), 'Proxy socket error:', error)
  })
})

const server = https.createServer(httpsOptions, (req, res) => {
  console.log(new Date(), 'Request ', req.headers.host)
  if (req.headers.host in routes) {
    const target = routes[req.headers.host]
    console.log(new Date(), 'Proxing', req.headers.host, 'to', target)
    proxy.web(req, res, {target})
  } else {
    console.log(new Date(), 'Unknown host', req.headers.host)
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
})

server.on('upgrade', (req, socket, head) => {
  if (req.headers.host in routes) {
    const target = routes[req.headers.host]
    console.log(new Date(), 'Websocket upgrade', req.headers.host, 'to', target)

    try {
      proxy.ws(req, socket, head, {target})
    } catch(e) {
      console.error(new Date(), 'Unable to proxy ws', req.headers.host, 'to', target)
    }
  } else {
    console.log(new Date(), 'Unknown host on upgrade', req.headers.host)         
  }
})

server.on('clientError', (err, socket) => {
  console.error(new Date(), 'Client error', JSON.stringify(err))
})

server.on('error', (err, socket) => {
  console.error(new Date(), 'Unexpected error', JSON.stringify(err))
})

server.listen(port, () => {
  console.log(new Date(), 'Listening', port)
  console.log(new Date(), 'Routing', routes)
})
