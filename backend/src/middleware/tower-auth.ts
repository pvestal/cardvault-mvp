import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const TOWER_AUTH_URL = process.env.TOWER_AUTH_URL || 'http://localhost:8088';

interface TowerUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider?: string;
}

// Middleware to verify Tower Auth tokens
export async function verifyTowerAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with Tower Auth service
    const response = await axios.get(`${TOWER_AUTH_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (response.data.valid) {
      (req as any).user = response.data.user;
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Tower Auth verification failed:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// Helper to exchange Tower Auth token for CardVault session
export async function exchangeTowerToken(towerToken: string): Promise<TowerUser | null> {
  try {
    const response = await axios.get(`${TOWER_AUTH_URL}/api/auth/user`, {
      headers: { Authorization: `Bearer ${towerToken}` }
    });

    return response.data.user;
  } catch (error) {
    console.error('Failed to get Tower user:', error);
    return null;
  }
}