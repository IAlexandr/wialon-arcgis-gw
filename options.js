const version = require('./package.json').version;
const optionsSpec = {
  W_PORT: {
    required: true,
    default: '4445',
    env: 'W_PORT'
  },
  UPDATER_TO: {
    required: true,
    default: 20 * 1000,
    env: 'W_UPDATER_TO'
  },
  WIALON_U: {
    required: true,
    default: 'kitdemo',
    env: 'W_WIALON_U'
  },
  WIALON_P: {
    required: true,
    default: 'kitdemo',
    env: 'W_WIALON_P'
  },
  DEFAULT_PROTOCOL_TYPE: {
    required: true,
    default: require('./lib/server/protocol-types').WIALON_RETRANSLATOR,
    env: 'W_DEFAULT_PROTOCOL_TYPE'
  },
  WIALON_RETRANSLATOR_PORT: {
    required: true,
    default: 20163,
    env: 'W_WIALON_RETRANSLATOR_PORT'
  },
  FEATURE_SERVER_URL: {
    required: true,
    default: 'http://.../arcgis/rest/services/cheb/cheb_zhkh_tractors/FeatureServer/0',
    env: 'W_FEATURE_SERVER_URL'
  },
  REG_SOCKET_HOSTS: {
    require: true,
    default: "10.10.10.10,1.1.1.1",
    env: 'W_REG_SOCKET_HOSTS',
    preprocess: function (src) {
      const sr = src ? src.split(',').map(function (s) {
        return s.trim();
      }) : [];
      console.log('regHosts: ', JSON.stringify(sr, null, 2));
      return sr;
    }
  },
  WSSERVER_PORT: {
    required: true,
    default: 8888,
    env: 'W_WSSERVER_PORT'
  },

};

let options = {
  version
};

export default {...options, ...Object.keys(optionsSpec).map((key) => {
  if (!optionsSpec[key].preprocess) {
    optionsSpec[key].preprocess = function preprocess (str) {
      return str;
    };
  }
  const opt = { name: key };
  if (process.env[optionsSpec[key].env]) {
    opt.value = optionsSpec[key].preprocess(process.env[optionsSpec[key].env]);
  } else if (optionsSpec[key].default) {
    opt.value = optionsSpec[key].preprocess(optionsSpec[key].default);
  } else if (optionsSpec[key].required) {
    throw new Error('!!! REQUIRED OPTION NOT SET: ' + key);
  }
  return opt;
}).reduce((prev, cur) => {
  prev[cur.name] = cur.value;
  return prev;
}, {})};
