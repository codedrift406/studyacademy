import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import type { AuthRequest } from './auth';

function isLocalRequest(req: Request) {
    const ip = req.ip || req.socket.remoteAddress || '';
    return ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('localhost');
}

export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication requests. Try again later.' },
    skip: (req) => process.env.NODE_ENV !== 'production' && isLocalRequest(req),
});

export const apiRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 240,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded. Please slow down.' },
    skip: (req) => process.env.NODE_ENV !== 'production' && isLocalRequest(req),
});

export function auditLogMiddleware(req: Request, res: Response, next: NextFunction) {
    const method = req.method.toUpperCase();
    const shouldAudit = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
    if (!shouldAudit) {
        next();
        return;
    }

    const authReq = req as AuthRequest;
    const actorId = authReq.user?.id || null;
    const startedAt = Date.now();
    res.on('finish', () => {
        const status = res.statusCode;
        const metadata = JSON.stringify({
            status,
            durationMs: Date.now() - startedAt,
        });
        prisma.auditLog
            .create({
                data: {
                    actorId,
                    action: `${method} ${req.path}`,
                    entityType: 'API',
                    method,
                    path: req.originalUrl,
                    metadata,
                },
            })
            .catch(() => null);
    });

    next();
}
