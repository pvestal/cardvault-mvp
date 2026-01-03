import { Request, Response, NextFunction } from 'express';

const cache = new Map<string, any>();
const CACHE_TTL = 60 * 1000; // 1 minute

export const cacheMiddleware = (ttl: number = CACHE_TTL) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.originalUrl;
    const cached = cache.get(key);

    if (cached && cached.expires > Date.now()) {
      return res.json(cached.data);
    }

    const originalJson = res.json;
    res.json = function(data: any) {
      cache.set(key, {
        data,
        expires: Date.now() + ttl
      });
      return originalJson.call(this, data);
    };

    next();
  };
};
