# Logging Middleware

Reusable backend/frontend-safe logger for the evaluation logging API.

## Contract

The package exposes a `createLogger` helper that sends:

- `stack`
- `level`
- `package`
- `message`

to the protected `POST /logs` endpoint using the evaluation bearer token.

## Allowed Values

- `stack`: `backend`, `frontend`
- `level`: `debug`, `info`, `warn`, `error`, `fatal`
- `package`: validated against the allowed assessment package names

## Build

```bash
cd notification_app_be
npm run build
```
