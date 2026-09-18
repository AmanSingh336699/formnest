import pino from 'pino';
import { env, isDev } from './env';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.tokenHash',
  '*.secret',
  '*.apiKey',
  '*.keyHash',
  'authorization',
  'cookie',
  'password',
  'passwordHash',
  'token',
  'tokenHash',
  'secret',
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: redactPaths, censor: '[REDACTED]' },
  base: { service: 'formnest-api', env: env.NODE_ENV },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
        },
      }
    : {}),
});

export type Logger = typeof logger;
