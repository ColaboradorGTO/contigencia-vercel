import swaggerUi from 'swagger-ui-express';
import bodyParser from 'body-parser';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const app = express();
const PORT = 3000;

// Definindo __dirname manualmente
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Caminho do arquivo JSON gerado pelo swaggerAutogen
const swaggerFile = join(__dirname, 'swagger-output.json');

app.use(bodyParser.json());

// Servir o arquivo JSON gerado pelo swaggerAutogen
app.use('/swagger-output.json', express.static(swaggerFile));

// Configurar o Swagger UI para usar o arquivo JSON gerado
app.use('/doc', swaggerUi.serve, swaggerUi.setup(null, { swaggerOptions: { url: "/swagger-output.json" } }));

app.listen(PORT, () => {
    console.log(`Server is running!\nAPI documentation: http://localhost:${PORT}/doc`);
});

export default app;