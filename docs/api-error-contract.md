# API v1 - Contrato de Respostas HTTP

Base URL: `/api/v1`  
Formato: `application/json; charset=utf-8`

## 1. Envelope padrão

### Sucesso
```json
{
  "ok": true,
  "data": {},
  "meta": {
    "requestId": "req_...",
    "warnings": []
  }
}
```

### Erro
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Payload inválido.",
    "details": []
  },
  "meta": {
    "requestId": "req_..."
  }
}
```

## 3. Warnings (sucesso parcial)

Formato de warning:

```json
{
  "module": "iching",
  "code": "MODULE_TIMEOUT",
  "message": "Módulo excedeu timeout; síntese gerada sem este módulo.",
  "recoverable": true
}
```

No sucesso parcial:

- `status = 200`
- `ok = true`
- `meta.warnings` preenchido

## 4. Matriz por rota (v1)

### POST /astrology/natal-chart
- 200 SUCCESS: leitura natal gerada
- 400 VALIDATION_ERROR
- 401 AUTH_REQUIRED (se rota protegida)
- 500 LLM_PROVIDER_ERROR / INTERNAL_ERROR
- 503 LLM_LOCATION_UNSUPPORTED

### POST /oracles/runes/readings
- 200 SUCCESS
- 400 VALIDATION_ERROR
- 500 LLM_PROVIDER_ERROR / INTERNAL_ERROR
- 503 LLM_LOCATION_UNSUPPORTED

### POST /oracles/iching/readings
- 200 SUCCESS
- 400 VALIDATION_ERROR
- 500 LLM_PROVIDER_ERROR / INTERNAL_ERROR
- 503 LLM_LOCATION_UNSUPPORTED

### POST /unified/readings
- 200 SUCCESS: todos os módulos ok
- 200 PARTIAL_SUCCESS: 1+ módulos falharam, mas síntese final disponível com warnings
- 400 VALIDATION_ERROR
- 401 AUTH_REQUIRED (se rota protegida)
- 500 INTERNAL_ERROR (falha total da síntese)
- 503 LLM_LOCATION_UNSUPPORTED / UPSTREAM_UNAVAILABLE

### GET /unified/readings/:id
- 200 SUCCESS
- 400 VALIDATION_ERROR (id inválido)
- 401 AUTH_REQUIRED (se rota protegida)
- 404 NOT_FOUND
- 500 INTERNAL_ERROR

## 5. Contrato mínimo de saída da leitura unificada

```json
{
  "headline": "string",
  "essence": "string",
  "main_strength": "string",
  "attention_point": "string",
  "daily_action": "string",
  "micro_actions": ["string", "string", "string"],
  "integrated_reading": "string",
  "disclaimer": "Conteúdo para autoconhecimento e reflexão pessoal."
}
```

Campos adicionais permitidos:

- `warnings` (array)
- `modules` (debug opcional, controlado por ambiente)

## 6. Regras de implementação

- Não alterar `tarotController.js` atual (prompts e comportamento).
- Não quebrar rotas legadas.
- Todas as rotas v1 devem usar schema validation.
- Todas as rotas v1 devem incluir `requestId` na resposta.
- Nunca logar payload sensível completo.
