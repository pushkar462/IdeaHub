import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../infrastructure/observability/logger';
import pinoHttp from 'pino-http';

/**
 * Tracing middleware that ensures every request receives a unique x-request-id.
 * This ID propagates through logs to allow tracing across distributed queues and sockets.
 */
export const tracingMiddleware = () => {
  return [
    (req: Request, res: Response, next: NextFunction) => {
      const reqId = req.headers['x-request-id'] || uuidv4();
      req.headers['x-request-id'] = reqId; // Ensure it's always set
      res.setHeader('x-request-id', reqId);
      next();
    },
    pinoHttp({
      logger,
      genReqId: (req) => req.headers['x-request-id'] || uuidv4(),
    })
  ];
};
