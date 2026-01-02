export interface User {
  id: string;
  username: string;
}

export interface Card {
  id: string;
  name: string;
  card_number?: string;
  pin?: string;
  barcode_format: string;
  balance?: number;
  notes?: string;
  created_at: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
}

export interface CreateCardData {
  name: string;
  card_number: string;
  pin?: string;
  barcode_format?: string;
  balance?: number;
  notes?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}