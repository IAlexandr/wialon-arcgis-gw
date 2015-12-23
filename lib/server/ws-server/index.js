import { Server as WebSocketServer } from 'ws';

export default class WSServer {
  constructor (props) {
    var _this = this;
    const { port, regHosts } = props;
    _this.port = port;
    _this.regHosts = regHosts;
    _this.wss = new WebSocketServer({ port });
    _this.onConnection();
    console.log('WebSocketServer listening on port ', port);
  }

  onConnection () {
    var _this = this;
    _this.wss.on('connection', function connection(client) {
      if (_this.isRegistered(client)) {
        console.log('Ws-client connected. ', client.upgradeReq.connection.remoteAddress);
      } else {
        console.log('Ws-client not registered. Closed. ', client.upgradeReq.connection.remoteAddress);
        client.close();
      }
    });
  }

  isRegistered (client) {
    var _this = this;
    var clientHost = client.upgradeReq.connection.remoteAddress;
    var regAddr = _this.regHosts.filter(function (addr) {
      return addr === clientHost;
    });
    return regAddr[0];
  }

  broadcast (data) {
    var _this = this;
    const strData = JSON.stringify(data);
    _this.wss.clients.forEach(function each(client) {
      if (_this.isRegistered(client)) {
        client.send(strData, function (err) {
          if (err) {
            console.log('(client.send) err:', err.message);
          }
        });
      }
    });
  };
}
