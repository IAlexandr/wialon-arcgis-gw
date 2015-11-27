import { Router } from 'express';
import wialonToArcgis from './../wialon-to-arcgis';
import options from '../../../options';

const routers = [];

const mainRouter = Router();

mainRouter.get('/', function (req, res) {
  res.json({
    version: options.version
  });
});
//TODO вынести в отдельный модуль
mainRouter.get('/retranslator/start', function (req, res) {
  res.json({
    action: 'start',
    result: wialonToArcgis.start() ? 'started' : 'retranslator not found'
  });
});

mainRouter.get('/retranslator/stop', function (req, res) {
  wialonToArcgis.stop(() => {
    res.json({
      result: 'retranslator stopped.'
    });
  });
});

mainRouter.get('/retranslator/restart', function (req, res) {
  wialonToArcgis.restart(() => {
    res.json({
      result: 'restarted.'
    });
  });
});

const root = '/api/v1/';

export default (app) => {
  app.use(root, mainRouter);
  routers.forEach((r) => {
    const { route, router } = r;
    app.use(root + route, router);
  });
};
