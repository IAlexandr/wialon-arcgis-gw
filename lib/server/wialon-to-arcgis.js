import async from 'async';
import _ from 'lodash';
import wialonRetranslator from './wialon-retranslator';
import options from './../../options';
import { WIALON_RETRANSLATOR } from './protocol-types';
import { featureLayer } from 'arcgis-crud';

class WialonToArcgis {

  constructor (protocolType) {
    this.protocolType = protocolType || options.DEFAULT_PROTOCOL_TYPE;
    this.retranslator = this.getRetranslatorByProtocolType(this.protocolType);
    this.timeInterval = null;
    this.intervalSec = options.UPDATER_TO;
    this.bucket = [];
    this.controllers = [];
    this.FS = null;
  }

  start (callback) {
    const _this = this;
    if (_this.retranslator) {
        async.waterfall([
          (next) => {
            featureLayer.connect(options.FEATURE_SERVER_URL, (err, FS) => {
                if (err) {
                  return next(err);
                }
                _this.FS = FS;
                return next();
            });
          },
          (next) => {
            _this.FS.query({ returnGeometry: false, outFields: 'controllerId', where: "1=1"}, (err, result) => {
              if (err) {
                return next(err);
              }
              // TODO сделать проверку result.fields на наличие обязательных полей.
              const uniqControllers = {};
              if (!result.hasOwnProperty('features')) {
                return next(new Error('(wialon-to-arcgis/start): FS.query return wrong response.'));
              }
              _.uniq(result.features, 'controllerId').forEach((feature) => {
                uniqControllers[feature.controllerId] = feature;
              });
              return next(null, uniqControllers);
            });
          },
          (uniqControllers, next) => {
            _this.controllers = uniqControllers;
            _this.retranslator.start();
            _this.retranslator.emitter.on('message', (msg) => {
              _this.bucket.push(msg);
            });
            return next();
          },
          (next) => {
            _this.timeInterval = setInterval(() => {

              /* TODO
               разобрать все сообщения из _this.bucket по группам
               1. addList     => _this.FS.add(addList)
               2. updateList  => _this.FS.update(updateList)

               {
               "controllerId": "1001",
               "time": "2015-11-27T12:07:14.000Z",
               "posInfo": true,
               "digInputInfo": true,
               "digOutInfo": false,
               "alarm": false,
               "driversIdInfo": false,
               "data": [
               {
               "name": "posinfo",
               "value": {
               "lon": 47.236599999999996,
               "lat": 56.08390166666666,
               "height": 0,
               "speed": 32,
               "course": 241,
               "numSat": 4
               }
               },
               {
               "name": "avl_inputs",
               "value": -2147483648
               },
               {
               "name": "adc1",
               "value": 0
               },
               {
               "name": "adc2",
               "value": 0
               }
               ]
               }
               */
              const addList = [];
              const updateList = [];

              _this.bucket.forEach((message) => {
                if (_this.controllers.hasOwnProperty(message.controllerId)) {
                  updateList.push();
                } else {
                  addList.push();
                }
              });


              _this.bucket = [];
            }, _this.intervalSec);

            return next();
          }
        ], (err) => {
          return callback(err);
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
