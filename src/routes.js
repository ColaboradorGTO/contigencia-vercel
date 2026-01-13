import { Router } from 'express';

import ConsultaStatusNfeController from './Informatica/ConsultaNFCE/controllers/statusNfce.js'


const routes = new Router();
// routes.use(authMiddleware)

routes.get('/', (req, res) => {
    res.send('Hello World! Myltiane');
});


routes.get('/status-sefaz', ConsultaStatusNfeController.statusSefaz);


export default routes;

