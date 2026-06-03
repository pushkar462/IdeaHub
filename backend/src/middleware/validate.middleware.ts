import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { StatusCodes } from 'http-status-codes';

export const validate = (schema: ZodSchema<any>) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      // CRITICAL: Overwrite req objects with strictly validated data
      req.body = parsed.body || req.body;
      req.query = parsed.query || req.query;
      req.params = parsed.params || req.params;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Pass ZodError to the global error handler
        next(error);
      } else {
        next(new AppError('Validation error', StatusCodes.BAD_REQUEST));
      }
    }
  };
};
