import wialonRetranslator from './wialon-retranslator';
import options from './../../options';
import { WIALON_RETRANSLATOR } from './protocol-types';
import { featureLayer } from 'arcgis-crud';

const FEATURE_SERVER_URL = '...';
class WialonToArcgis {

  constructor (protocolType) {
    this.protocolType = protocolType || options.DEFAULT_PROTOCOL_TYPE;
    this.retranslator = this.getRetranslatorByProtocolType(this.protocolType);
    this.timeInterval = null;
    this.intervalSec = options.UPDATER_TO;
    this.bucket = [];
    this.FS = null;
  }

  start (callback) {
    const _this = this;
    if (_this.retranslator) {
      featureLayer.connect(FEATURE_SERVER_URL, (err, FS) => {
        if (err) {
          return callback(err);
        }
        _this.FS = FS;
        _this.retranslator.start();
        _this.retranslator.emitter.on('message', (msg) => {
          _this.bucket.push(msg);
        });

        _this.timeInterval = setInterval(() => {
          // TODO put to arcgis fc
          // _this.FS.
            _this.bucket = [];
        }, _this.intervalSec);
        return callback();
      });
    } else {
      return callback(new Error('retranslator (protocolType:', this.protocolType,') not exist'));
    }
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
