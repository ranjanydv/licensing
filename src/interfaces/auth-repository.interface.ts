import { IUser, IRole, ITokenBlacklist } from './auth.interface';

export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  create(user: Partial<IUser>): Promise<IUser>;
  update(id: string, userData: Partial<IUser>): Promise<IUser | null>;
  delete(id: string): Promise<boolean>;
  list(filters?: any): Promise<IUser[]>;
  isFirstUser(): Promise<boolean>;
}

export interface IRoleRepository {
  findById(id: string): Promise<IRole | null>;
  findByName(name: string): Promise<IRole | null>;
  create(role: Partial<IRole>): Promise<IRole>;
  update(id: string, roleData: Partial<IRole>): Promise<IRole | null>;
  delete(id: string): Promise<boolean>;
  list(): Promise<IRole[]>;
}

export interface ITokenBlacklistRepository {
  add(token: string, expiresAt: Date): Promise<void>;
  isBlacklisted(token: string): Promise<boolean>;
  removeExpired(): Promise<void>;
}