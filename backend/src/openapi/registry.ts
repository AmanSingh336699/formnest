import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';

import type { OpenAPIObject } from 'openapi3-ts/oas31';

import { z } from 'zod';

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export const ErrorSchema = registry.register(
  'Error',
  z.object({
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
    }),
  })
);

export function generateOpenApiDocument(): OpenAPIObject {
  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      version: '1.0.0',
      title: 'FormNest API',
      description: 'Build forms in minutes. Collect responses forever.',
      contact: {
        name: 'FormNest Support',
        email: 'support@formnest.com',
      },
      license: {
        name: 'Proprietary',
      },
    },
    servers: [
      {
        url: 'https://api.formnest.com/api/v1',
        description: 'Production',
      },
      {
        url: 'http://localhost:4000/api/v1',
        description: 'Local',
      },
    ],
    security: [{ bearerAuth: [] }],
  });
}