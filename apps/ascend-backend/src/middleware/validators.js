/**
 * Input validation middleware using Joi
 */

import Joi from 'joi';
import { AppError, ErrorCode } from './errorHandler.js';

// Validation schemas for each route
export const schemas = {
  solve: Joi.object({
    problem: Joi.string().required().min(1).max(50000).messages({
      'string.empty': 'Problem text is required',
      'string.max': 'Problem text exceeds maximum length',
      'any.required': 'Problem text is required',
    }),
    provider: Joi.string().valid('claude', 'openai').default('claude'),
    language: Joi.string().valid(
      'auto',
      // Languages
      'python', 'python2', 'python3', 'javascript', 'typescript', 'java',
      'c', 'cpp', 'csharp', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
      'scala', 'bash', 'perl', 'lua', 'r', 'haskell', 'clojure', 'elixir',
      'erlang', 'fsharp', 'ocaml', 'dart', 'julia', 'objectivec',
      'coffeescript', 'vb', 'tcl',
      // Databases
      'sql', 'mysql', 'postgresql',
      // Frameworks
      'react', 'vue', 'angular', 'svelte', 'nextjs', 'html', 'nodejs',
      'django', 'rails', 'spring',
      // DevOps
      'terraform', 'kubernetes', 'docker', 'jenkins', 'yaml',
      // ML / Data
      'pyspark', 'pytorch', 'tensorflow', 'scipy'
    ).default('auto'),
    fast: Joi.boolean().default(true),
    detailLevel: Joi.string().valid('basic', 'detailed', 'brief', 'high-level').default('detailed'),
    model: Joi.string().allow('', null),
    ascendMode: Joi.string().valid('coding', 'system-design', 'behavioral').default('coding'),
    designDetailLevel: Joi.string().valid('basic', 'full').default('basic'),
  }),

  fetch: Joi.object({
    url: Joi.string().uri().required().messages({
      'string.uri': 'Invalid URL format',
      'any.required': 'URL is required',
    }),
  }),

  fix: Joi.object({
    code: Joi.string().required().min(1).max(100000).messages({
      'string.empty': 'Code is required',
      'any.required': 'Code is required',
    }),
    error: Joi.string().required().min(1).max(10000).messages({
      'string.empty': 'Error message is required',
      'any.required': 'Error message is required',
    }),
    language: Joi.string().allow('', null),
    provider: Joi.string().valid('claude', 'openai').default('openai'),
  }),

  run: Joi.object({
    code: Joi.string().required().min(1).max(100000).messages({
      'string.empty': 'Code is required',
      'any.required': 'Code is required',
    }),
    language: Joi.string().valid(
      'auto',
      'python', 'python2', 'python3', 'javascript', 'typescript', 'java',
      'c', 'cpp', 'csharp', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
      'scala', 'bash', 'perl', 'lua', 'r', 'haskell', 'clojure', 'elixir',
      'erlang', 'fsharp', 'ocaml', 'dart', 'julia', 'objectivec',
      'coffeescript', 'vb', 'tcl',
      'sql', 'mysql', 'postgresql',
      'react', 'vue', 'angular', 'svelte', 'nextjs', 'html', 'nodejs',
      'django', 'rails', 'spring',
      'terraform', 'kubernetes', 'docker', 'jenkins', 'yaml',
      'pyspark', 'pytorch', 'tensorflow', 'scipy'
    ).required().messages({
      'any.only': 'Unsupported language',
      'any.required': 'Language is required',
    }),
    input: Joi.string().allow('', null).max(10000),
    args: Joi.alternatives().try(
      Joi.array().items(Joi.string().allow('')),
      Joi.string().allow('')
    ).allow(null, '').default([]),
  }),

  followup: Joi.object({
    question: Joi.string().required().min(1).max(5000).messages({
      'string.empty': 'Question is required',
      'any.required': 'Question is required',
    }),
    problem: Joi.string().allow('', null).max(50000),
    code: Joi.string().allow('', null).max(100000),
    pitch: Joi.string().allow('', null).max(10000),
    context: Joi.string().allow('', null).max(10000),
    currentDesign: Joi.object().allow(null),
    provider: Joi.string().valid('claude', 'openai').default('claude'),
    model: Joi.string().allow('', null),
  }),
};

/**
 * Validation middleware factory
 * @param {string} schemaName - Name of the schema to use for validation
 * @returns {Function} Express middleware function
 */
export function validate(schemaName) {
  const schema = schemas[schemaName];

  if (!schema) {
    throw new Error(`Unknown validation schema: ${schemaName}`);
  }

  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(d => d.message).join('; ');
      return next(new AppError(details, ErrorCode.VALIDATION_ERROR));
    }

    // Replace body with validated/sanitized value
    req.body = value;
    next();
  };
}

export default validate;
