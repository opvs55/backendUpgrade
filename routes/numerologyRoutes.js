// routes/numerologyRoutes.js
import express from 'express';
// Importa as funções do controller de numerologia
import { 
  getOrCalculateNumerology, 
  resetNumerologyReading 
} from '../controllers/numerologyController.js'; 

// Opcional: Importar middleware de autenticação, se aplicável
// import requireAuth from '../middleware/requireAuth.js'; // Exemplo de como importar

// Cria um novo router do Express
const router = express.Router();

// Opcional: Aplicar middleware de autenticação a TODAS as rotas neste ficheiro
// Se todas as operações de numerologia exigem login, descomente a linha abaixo
// router.use(requireAuth); 

// Define a rota POST para a raiz ('/') deste router (corresponderá a /api/numerology)
// Quando uma requisição POST chegar, ela será tratada pela função getOrCalculateNumerology
router.post('/', getOrCalculateNumerology);   

// Define a rota DELETE para '/reset' (corresponderá a /api/numerology/reset)
// Quando uma requisição DELETE chegar, ela será tratada pela função resetNumerologyReading
router.delete('/reset', resetNumerologyReading); 

// Exporta o router configurado para ser usado no index.js principal
export default router;
