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

  updateControllerList (next) {
    const _this = this;

    console.log('> updateControllerList');
    _this.FS.query({ returnGeometry: false, outFields: 'controllerId', where: "1=1"}, (err, result) => {
      if (err) {
        return next(err);
      }
      const uniqControllers = {};
      if (!result.hasOwnProperty('features')) {
        return next(new Error('(wialon-to-arcgis/start): FS.query return wrong response.'));
      }

      console.log('result.features: ', JSON.stringify(result.features, null, 2));
      _.uniq(result.features, 'controllerId').forEach((feature) => {
        uniqControllers[feature.controllerId] = feature;
      });
      _this.controllers = uniqControllers;
      console.log('controllers: ', JSON.stringify(_this.controllers, null, 2));
      console.log('(updated) uniqControllers.length: ', Object.keys(uniqControllers).length, '================');
      return next();
    });
  }

  prepProps (controller, message) {
    controller.attributes.controllerId = message.controllerId;
    controller.attributes.time = message.time;
    message.data.forEach((obj) => {
      if (obj.name === 'posinfo') {
        controller.geometry = {
        x: obj.value.lon,
        y: obj.value.lat
      };
        controller.attributes.speed = obj.value.speed;
        controller.attributes.course = obj.value.course;
      }
    });
    return controller;
  }

  updateControllerFeatures () {
    const _this = this;
    _this.updateControllerList((err) => {
      if (err) {
        console.error('(_this.timeInterval/updateControllerFeatures):',err.message);
      } else {
        const addList = [];
        const updateList = [];
        const addObj = {};
        const updateObj = {};

        _this.bucket.forEach((message) => {
          if (_this.controllers.hasOwnProperty(message.controllerId) && !addObj.hasOwnProperty(message.controllerId)) {
            updateObj[message.controllerId] = _this.prepProps(_this.controllers[message.controllerId], message);
          } else {
            addObj[message.controllerId] = _this.prepProps({
              attributes: {}
            }, message);
          }
        });
        Object.keys(addObj).forEach((obj) => {
          addList.push(obj);
        });
        Object.keys(updateObj).forEach((obj) => {
          updateList.push(obj);
        });

        console.log('addList.length: ', addList.length);
        console.log('updateList.length: ', updateList.length);
        async.waterfall([
            (callback) => {
              if (addList.length > 0) {
                console.log('addList: ', JSON.stringify(addList, null, 2));
                _this.FS.add(addList, (err, addResults) => {
                  if (err) {
                    console.log('(FS.add) err:', JSON.stringify(err, null, 2));
                    return callback(err);
                  }
                  console.log('(FS.add) addResults:', JSON.stringify(addResults, null, 2));
                  return callback();
                });
              } else {
                return callback();
              }
            },
          (callback) => {
            if (updateList.length > 0) {
              console.log('updateList: ', JSON.stringify(updateList, null, 2));
              _this.FS.update(updateList, (err, updateResults) => {
                if (err) {
                  console.log('(FS.update) err:', JSON.stringify(err, null, 2));
                  return callback(err);
                }
                console.log('(FS.update) updateResults:', JSON.stringify(updateResults, null, 2));
                return callback(null);
              });
            }
          }
        ], (err) => {
          if (err) {
            console.log('(timeInterval/async.parallel) err: ', err.message);
          }
          _this.bucket = [];
          console.log('bucket cleared.');
        });
      }
    });
  }

  setUpdateTimeInterval () {
    const _this = this;
    _this.timeInterval = setInterval(() => {
      console.log('> timeInterval');
      if (_this.FS) {
        console.log('> updateControllerFeatures');
_this.updateControllerFeatures();
      } else {
        console.log('try featureLayer.connect');
        featureLayer.connect(options.FEATURE_SERVER_URL, (err, FS) => {
          if (err) {
            console.log('(setUpdateTimeInterval/featureLayerConnect) err: ', err.message);
          } else {
            console.log('featureLayer connected.');
            _this.FS = FS;
            console.log('_this.bucket.length: ', _this.bucket.length);
            _this.updateControllerFeatures();
          }
        });
      }
    }, _this.intervalSec);
  }

  start (callback) {
    console.log('starting..');
    const _this = this;
    if (_this.retranslator) {
        async.waterfall([
          (next) => {
            _this.retranslator.start();
            _this.retranslator.emitter.on('message', (msg) => {
              _this.bucket.push(msg);
            });
            return next();
          },
          (next) => {
            _this.setUpdateTimeInterval();
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
    clearInterval(this.timeInterval);
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
