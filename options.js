const version = require('./package.json').version;
const optionsSpec = {
  W_PORT: {
    required: true,
    default: '4445',
    env: 'W_PORT'
  },
  UPDATER_TO: {
    required: true,
    default: 10 * 1000,
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
