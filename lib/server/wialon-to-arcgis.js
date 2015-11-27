import wialonRetranslator from './wialon-retranslator';
import options from './../../options';
import { WIALON_RETRANSLATOR } from './protocol-types';

class WialonToArcgis {

  constructor () {
    this.retranslator = this.getRetranslatorByProtocolType(options.DEFAULT_PROTOCOL_TYPE);
    this.timeInterval = null;
    this.intervalSec = options.UPDATER_TO;
  }

  start () {
    const _this = this;
    if (_this.retranslator) {
      _this.retranslator.start();
      _this.timeInterval = setInterval(() => {
        _this.retranslator.emitter.on('message', (msg) => {
          console.log(JSON.stringify(msg, null, 2));
        });
      }, _this.intervalSec);
      return true;
    }
    return false;
  }

  stop (callback) {
// TODO soft stop
    this.retranslator.stop(callback);
  }

  restart (callback) {
    this.stop(() => {
      this.start();
      return callback();
    });
  }

  getRetranslatorByProtocolType (protocolType) {
    switch (protocolType) {
      case WIALON_RETRANSLATOR:
        return new wialonRetranslator({ port: options.WIALON_RETRANSLATOR_PORT });
      default:
        console.log('protocol: ', this.protocolType, ' not supported.');
        return null;
    }
  }

  changeProtocolTypeAndRestart (protocolType, callback) {
    this.protocolType = protocolType;
    this.restart(callback);
  }

}

const wta = new WialonToArcgis();

export default wta;
