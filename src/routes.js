import { Router } from 'express';

import ConsultaNFceController  from './Informatica/ConsultaNFCE/controllers/index.js'
import ConsultaNFeController from './Informatica/ConsultaNFCE/controllers/nfe.js'
import ConsultaStatusNfeController from './Informatica/ConsultaNFCE/controllers/statusNfce.js'


const routes = new Router();
// routes.use(authMiddleware)

routes.get('/', (req, res) => {
    res.send('Hello World! Myltiane');
});


routes.get('/status-sefaz', ConsultaStatusNfeController.statusSefaz);


export default routes;

