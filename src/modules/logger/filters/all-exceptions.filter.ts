import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { LogService } from '../logger.service';
import { LogLevel } from '../enums/log-level.enum';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  correlationId?: string;
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private recursionDepth = 0;
  private readonly maxRecursion = 3;

  constructor(private readonly logService: LogService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (this.recursionDepth >= this.maxRecursion) {
      console.error('Max recursion depth reached in exception filter. Original error:', exception);
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      if (!response.headersSent) {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'Internal Server Error',
          timestamp: new Date().toISOString(),
        });
      }
      return;
    }

    this.recursionDepth++;

    try {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request>();

      if (response.headersSent) {
        this.recursionDepth--;
        return;
      }

      const status = this.getHttpStatus(exception);
      const message = this.getErrorMessage(exception);
      const errorName = this.getErrorName(exception);

      const correlationId = (request as any).correlationId || request.headers['x-correlation-id'] as string || undefined;

      const logContext = {
        module: this.getErrorModule(exception),
        correlationId,
        url: request.originalUrl || request.url,
        method: request.method,
        statusCode: status,
        ip: request.ip || request.socket?.remoteAddress,
        userAgent: request.headers['user-agent'],
        userId: (request as any).user?.id,
        stackTrace: exception instanceof Error ? exception.stack : undefined,
        context: {
          body: this.sanitizeBody(request.body),
          query: request.query as Record<string, any>,
          params: request.params,
          headers: this.sanitizeHeaders(request.headers),
        },
      };

      const logLevel = status >= 500 ? LogLevel.FATAL : status >= 400 ? LogLevel.ERROR : LogLevel.WARN;
      const logMessage = `[${request.method}] ${request.originalUrl || request.url} - ${status} - ${message}`;

      this.logService[logLevel](logMessage, logContext);

      const errorResponse: ErrorResponse = {
        statusCode: status,
        message,
        error: errorName,
        correlationId,
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      response.status(status).json(errorResponse);
    } catch (filterError) {
      this.logger.error('Exception filter itself threw an error', filterError);
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      if (!response.headersSent) {
        try {
          response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
            error: 'Internal Server Error',
            timestamp: new Date().toISOString(),
          });
        } catch {
          // last resort — response may already be sent
        }
      }
    } finally {
      this.recursionDepth--;
    }
  }

  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    if (exception instanceof QueryFailedError) {
      const driverError = (exception as any).driverError;
      if (driverError?.errno === 1062) return HttpStatus.CONFLICT;
      if (driverError?.errno === 1451) return HttpStatus.CONFLICT;
      if (driverError?.errno === 1452) return HttpStatus.BAD_REQUEST;
      return HttpStatus.INTERNAL_SERVER_ERROR;
    }
    if (exception instanceof SyntaxError) {
      return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getErrorMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') return response;
      if (typeof response === 'object' && response !== null) {
        const msg = (response as any).message;
        if (Array.isArray(msg)) return msg.join('; ');
        if (typeof msg === 'string') return msg;
      }
      return exception.message;
    }
    if (exception instanceof QueryFailedError) {
      const driverError = (exception as any).driverError;
      if (driverError?.errno === 1062) return 'Duplicate entry — resource already exists';
      if (driverError?.errno === 1451) return 'Cannot delete — resource is in use';
      if (driverError?.errno === 1452) return 'Referenced resource not found';
      return 'Database query failed';
    }
    if (exception instanceof SyntaxError) {
      return 'Invalid request syntax';
    }
    if (exception instanceof Error) {
      return exception.message || 'Internal server error';
    }
    return 'An unexpected error occurred';
  }

  private getErrorName(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null && (response as any).error) {
        return (response as any).error;
      }
      return exception.name;
    }
    if (exception instanceof QueryFailedError) return 'Database Error';
    if (exception instanceof SyntaxError) return 'Bad Request';
    if (exception instanceof Error) return exception.constructor?.name || 'Error';
    return 'Unknown Error';
  }

  private getErrorModule(exception: unknown): string | undefined {
    if (exception instanceof Error && exception.stack) {
      const match = exception.stack.match(/src\/modules\/(\w+)\//);
      return match ? match[1] : undefined;
    }
    return undefined;
  }

  private sanitizeBody(body: any): Record<string, any> | undefined {
    if (!body) return undefined;
    if (typeof body !== 'object') return { value: '[REDACTED]' };
    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'accessToken', 'refreshToken'];
    for (const [key, value] of Object.entries(body)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = typeof value === 'string' && value.length > 1000 ? value.substring(0, 200) + '...' : value;
      }
    }
    return sanitized;
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];
    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        sanitized[key] = value.substring(0, 500);
      } else {
        sanitized[key] = String(value).substring(0, 500);
      }
    }
    return sanitized;
  }
}
