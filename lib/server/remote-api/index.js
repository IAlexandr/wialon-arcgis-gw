
import request from 'superagent-es6-promise';
import options from './../../../options';

export default class {
  constructor () {
    this.timeInterval = null;
    this.intervalSec = options.UPDATER_TO;
    this.isAuthorized = false;
    this.profile = {};
  }

  start () {
    const _this = this;
    console.log('Updater started.');
    _this.getData();
    _this.timeInterval = setInterval(() => {
      _this.getData();
      console.log('get data');
    }, _this.intervalSec);
  }

  stop () {
    clearInterval(this.timeInterval);
    console.log('Updater stopped.');
  }

  authorize () {
    console.log('authorizing..');
    request(options.WIALON_URL)
      .query({
        svc:'core/login',
        params:JSON.stringify({
          user: options.WIALON_U,
          password: options.WIALON_P
        })
      })
      .then(response => {
        if (!response.ok) {
          console.log('not authorized, response not ok');
        }

        console.log('authorized. ', JSON.stringify(response.body.eid));
        this.profile = response.body;
        this.isAuthorized = true;
      }, (err) => {
        console.log('authorize err: ', JSON.stringify(err));
      });
  }

  getUnits () {
    if (this.isAuthorized) {
      request(options.WIALON_URL)
        .query({
          svc:'core/search_items',
          params:JSON.stringify({
            "spec":{
              "itemsType":"avl_unit",
              "propName":"sys_id",
              "propValueMask":"*",
              "sortType":"sys_id",
              "propType":"list"
            },
            "force":1,
            "flags":4097,
            "from":0,
            "to":1
          }),
          sid: this.profile.eid
        })
        .then(response => {
          if (!response.ok) {
            console.log('response not ok');
            // TODO проверить по номеру ошибки, если неавторизованный => this.authorize()
          }
          console.log('units: ', JSON.stringify(response.body));
        });
    } else {
      console.log('getData: not authorized!');
      this.authorize();
    }
  }

  getData () {
    if (this.isAuthorized) {
      request('https://kit-api.wialon.com/wialon/ajax.html')
        .query({
          svc:'core/search_items',
          params:JSON.stringify({
            "spec":{
              "itemsType":"avl_unit",
              "propName":"sys_id",
              "propValueMask":"*",
              "sortType":"sys_id",
              "propType":"list"
            },
            "force":1,
            "flags":4097,
            "from":0,
            "to":1
          }),
          sid: this.profile.eid
        })
        .then(response => {
          if (!response.ok) {
            console.log('response not ok');
            // TODO проверить по номеру ошибки, если неавторизованный => this.authorize()
          }
          console.log('units: ', JSON.stringify(response.body));
        });
    } else {
      console.log('getData: not authorized!');
      this.authorize();
    }

  }
}


