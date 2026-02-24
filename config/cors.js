export const corsOptions = {
  origin: (origin, callback) => {
    // Permite chamadas locais, Postman ou mobile (sem origin)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://oraculo-front-2-0.vercel.app' // O seu link exato
    ];

    // Verifica se a origem está na lista OU se é qualquer subdomínio da Vercel
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    console.log('Bloqueado pelo CORS:', origin);
    return callback(new Error('Bloqueado pelo CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};
