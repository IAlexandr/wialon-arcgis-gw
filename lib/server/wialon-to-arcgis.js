import async from 'async';
import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import wialonRetranslator from './wialon-retranslator';
import options from './../../options';
import { WIALON_RETRANSLATOR } from './protocol-types';
import { featureLayer } from 'arcgis-crud';

const INFOFILE_PATH = path.resolve(__dirname, './../../info.txt');

class WialonToArcgis {

  constructor (protocolType) {
    this.protocolType = protocolType || options.DEFAULT_PROTOCOL_TYPE;
    this.retranslator = this.getRetranslatorByProtocolType(this.protocolType);
    this.timeInterval = null;
    this.intervalSec = options.UPDATER_TO;
    this.bucket = [];
    this.controllers = [];
    this.FS = null;
    this.info = {};
  }

  updateControllerList (next) {
    const _this = this;

    //console.log('> updateControllerList');
    _this.FS.query({ returnGeometry: false, outFields: 'OBJECTID,controllerId', where: "1=1" }, (err, result) => {
      if (err) {
        return next(err);
      }
      const uniqControllers = {};
      if (!result.hasOwnProperty('features')) {
        return next(new Error('(wialon-to-arcgis/start): FS.query return wrong response.'));
      }

      //console.log('result.features: ', JSON.stringify(result.features, null, 2));
      _.uniq(result.features, 'attributes.controllerId').forEach((feature) => {
        uniqControllers[feature.attributes.controllerId] = feature;
      });
      _this.controllers = uniqControllers;
      //console.log('controllers: ', JSON.stringify(_this.controllers, null, 2));
      //console.log('(updated) get from FS uniqControllers.length: ', Object.keys(uniqControllers).length, '================');
      return next();
    });
  }

  prepProps (controller, message) {
    const _this = this;
    controller.attributes.controllerId = message.controllerId;
    controller.attributes.ukName = _this.info[message.controllerId] ? _this.info[message.controllerId].ukName : '-';
    controller.attributes.dNumber = _this.info[message.controllerId] ? _this.info[message.controllerId].dNumber : '-';
    controller.attributes.time = message.time.toLocaleString();
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

  readInfoFile (callback) {
    const _this = this;
    // спец. врем. решение
    if (fs.existsSync(INFOFILE_PATH)) {
      console.log('file exist');
      fs.readFile(INFOFILE_PATH, (err, buf) => {
        if (err) {
          return callback(err);
        }
        const text = buf.toString();
        const lineArr = text.split('\r\n').reverse();
        lineArr.splice(0, 1);
        //console.log('lineArr',JSON.stringify(lineArr, null, 2));
        let i = 0;
        const result = {};
        let preName = '';
        if (lineArr.length > 1) {
          let ukName = lineArr[1].match(/[^[\[]+(?=\])/g);
          result[lineArr[0]] = {
            ukName: ukName ? ukName[0] : ukName,
            dNumber: lineArr[1].match(/[^У]*/i)[0].trim()
          }
        }
        lineArr.forEach((line) => {
          //console.log(i);
          if (!(i % 2 || i === 0)) {
            preName = line;
            //console.log(i, 'preName', preName);
          } else {
            const ukName = line.match(/[^[\[]+(?=\])/g);
            //console.log('ukName',JSON.stringify(ukName, null, 2));
            result[preName] = {
              ukName: ukName ? ukName[0] : ukName,
              dNumber: line.match(/[^У]*/i)[0].trim()
            };
            //console.log('result[preName] ', JSON.stringify(result[preName], null, 2));
          }
          i++;
        });
        //console.log('info objs:', Object.keys(result).length);
        //console.log('info objs:', JSON.stringify(result, null, 2));
        _this.info = result;
        return callback();
      });
    } else {
      console.log('file info not found.');
      return callback();
    }
  }

  updateControllerFeatures () {
    console.log('.............................');
    const _this = this;
    _this.updateControllerList((err) => {
      if (err) {
        console.error('(_this.timeInterval/updateControllerFeatures):', err.message);
      } else {
        const addList = [];
        const updateList = [];
        const addObj = {};
        const updateObj = {};
        console.log('bucket.length: ', _this.bucket.length);
        _this.bucket.forEach((message) => {
          if (_this.controllers.hasOwnProperty(message.controllerId) && !addObj.hasOwnProperty(message.controllerId)) {
            updateObj[message.controllerId] = _this.prepProps(_this.controllers[message.controllerId], message);
          } else {
            addObj[message.controllerId] = _this.prepProps({
              attributes: {}
            }, message);
          }
        });
        Object.keys(addObj).forEach((key) => {
          addList.push(addObj[key]);
        });
        Object.keys(updateObj).forEach((key) => {
          updateList.push(updateObj[key]);
        });

        console.log('addList.length: ', addList.length);
        console.log('updateList.length: ', updateList.length);
        async.waterfall([
          (callback) => {
            if (addList.length > 0) {
              //console.log('addList: ', JSON.stringify(addList, null, 2));
              _this.FS.add(addList, (err, addResults) => {
                if (err) {
                  console.log('(FS.add) err:', JSON.stringify(err, null, 2));
                  return callback(err);
                }
                console.log('(FS.add) addResults:', addResults.length);
                return callback();
              });
            } else {
              return callback();
            }
          },
          (callback) => {
            if (updateList.length > 0) {
              //console.log('updateList: ', JSON.stringify(updateList, null, 2));
              _this.FS.update(updateList, (err, updateResults) => {
                if (err) {
                  console.log('(FS.update) err:', JSON.stringify(err, null, 2));
                  return callback(err);
                }
                console.log('(FS.update) updateResults:', updateResults.length);
                return callback();
              });
            } else {
              return callback();
            }
          }
        ], (err) => {
          if (err) {
            console.log('(timeInterval/async.parallel) err: ', err.message);
          }
          _this.bucket = [];
          console.log('bucket cleared.');
          console.log('.............................');
        });
      }
    });
  }

  setUpdateTimeInterval () {
    const _this = this;
    _this.timeInterval = setInterval(() => {
      //console.log('> timeInterval');
      if (_this.FS) {
        //console.log('> updateControllerFeatures');
        _this.updateControllerFeatures();
      } else {
        //console.log('try featureLayer.connect');
        featureLayer.connect(options.FEATURE_SERVER_URL, (err, FS) => {
          if (err) {
            console.log('(setUpdateTimeInterval/featureLayerConnect) err: ', err.message);
          } else {
            console.log('featureLayer connected.');
            _this.FS = FS;
            _this.updateControllerFeatures();
          }
        });
      }
    }, _this.intervalSec);
  }

  start (callback) {
    console.log('(wialon-to-arcgis) starting..');
    const _this = this;
    if (_this.retranslator) {
      async.waterfall([
        _this.readInfoFile.bind(_this),
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
      return callback(new Error('retranslator (protocolType:', this.protocolType, ') not exist'));
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
