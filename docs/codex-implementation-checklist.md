# Checklist de Implementação - API v1 Multi-Oráculos

## A. Estrutura de pastas
- [ ] Criar:
  - [ ] `modules/astrology/natalChart.controller.js`
  - [ ] `modules/oracles/runes.controller.js`
  - [ ] `modules/oracles/iching.controller.js`
  - [ ] `modules/unified/unified.controller.js`
  - [ ] `modules/unified/unified.service.js`
  - [ ] `modules/unified/unified.schema.js`
  - [ ] `shared/http/errorCodes.js`
  - [ ] `shared/http/AppError.js`
  - [ ] `shared/http/errorHandler.js`
  - [ ] `shared/http/requestId.js`
  - [ ] `shared/validation/validate.js`
  - [ ] `shared/async/withTimeout.js`

## B. Middleware global
- [ ] `requestId` middleware (setar `req.requestId`)
- [ ] `errorHandler` único no final da app
- [ ] resposta padronizada (`ok`, `data/error`, `meta.requestId`)
- [ ] mapear erro de localização LLM para `503 LLM_LOCATION_UNSUPPORTED`

## C. Schemas (Zod)
- [ ] schema `natalChartInputSchema`
- [ ] schema `runesInputSchema`
- [ ] schema `ichingInputSchema`
- [ ] schema `unifiedInputSchema`
- [ ] schema `unifiedOutputSchema`
- [ ] middleware `validate(schema)` em todas rotas v1

## D. Rotas v1
- [ ] `POST /api/v1/astrology/natal-chart`
- [ ] `POST /api/v1/oracles/runes/readings`
- [ ] `POST /api/v1/oracles/iching/readings`
- [ ] `POST /api/v1/unified/readings`
- [ ] `GET  /api/v1/unified/readings/:id`
- [ ] manter rotas legadas inalteradas

## E. Unified Service
- [ ] Executar módulos em paralelo com `Promise.allSettled`
- [ ] Aplicar timeout por módulo com `withTimeout`
- [ ] Normalizar cada módulo para:
  - [ ] `themes[]`
  - [ ] `risk_flags[]`
  - [ ] `strength_flags[]`
  - [ ] `recommended_actions[]`
- [ ] Se módulo falhar, adicionar warning e seguir síntese
- [ ] Síntese final com LLM
- [ ] Validar JSON final contra `unifiedOutputSchema`
- [ ] Retornar `200` com warnings em falha parcial

## F. Persistência (se ativa no backend)
- [ ] Persistir resultado final + outputs por módulo
- [ ] Implementar `GET /unified/readings/:id`
- [ ] Se persistência não configurada, usar repositório em memória com aviso

## G. Testes
- [ ] Sucesso total (todos módulos ok)
- [ ] Falha parcial (1 módulo timeout/falha)
- [ ] Validação 400 (campo faltando)
- [ ] Erro LLM 503 (location unsupported)
- [ ] GET por id encontrado
- [ ] GET por id não encontrado (404)

## H. cURL mínimo de validação

### Natal chart
```bash
curl -X POST http://localhost:3001/api/v1/astrology/natal-chart \
  -H "Content-Type: application/json" \
  -d '{
    "birthDate":"1994-08-15",
    "birthTime":"14:30",
    "city":"São Paulo",
    "country":"BR",
    "timezone":"America/Sao_Paulo"
  }'
```

### Runas
```bash
curl -X POST http://localhost:3001/api/v1/oracles/runes/readings \
  -H "Content-Type: application/json" \
  -d '{
    "question":"Qual energia da minha semana?",
    "drawCount":3
  }'
```

### I Ching
```bash
curl -X POST http://localhost:3001/api/v1/oracles/iching/readings \
  -H "Content-Type: application/json" \
  -d '{
    "question":"Qual melhor postura para trabalho?",
    "method":"coins"
  }'
```

### Unified
```bash
curl -X POST http://localhost:3001/api/v1/unified/readings \
  -H "Content-Type: application/json" \
  -d '{
    "question":"Como alinhar vida pessoal e trabalho?",
    "focusArea":"carreira",
    "natalInput":{
      "birthDate":"1994-08-15",
      "birthTime":"14:30",
      "city":"São Paulo",
      "country":"BR",
      "timezone":"America/Sao_Paulo"
    },
    "runesInput":{"drawCount":3},
    "ichingInput":{"method":"coins"},
    "tarotSnapshot":{"summary":"..."},
    "numerologySnapshot":{"summary":"..."}
  }'
```
