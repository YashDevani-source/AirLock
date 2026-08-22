export interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export interface RepositoryPermission {
  admin: boolean;
  maintain?: boolean;
  push: boolean;
  triage?: boolean;
  pull: boolean;
}

export interface Repository {
  owner: string;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  html_url: string;
  permissions?: RepositoryPermission;
}

export interface ServerConfig {
  protocol: 'http' | 'https';
  host: string;
  port: number | null;
  route: string;
}

export interface RepositoryConfig {
  owner: string;
  name: string;
}

export interface CLIConfig {
  github?: {
    username: string;
  };
  repository?: RepositoryConfig;
  server?: ServerConfig;
}

export interface AuthCredentials {
  accessToken: string;
  tokenType?: string;
  scope?: string;
  createdAt: string;
}

export interface WebhookOptions {
  url: string;
  secret?: string;
  events?: string[];
  active?: boolean;
  insecureSsl?: boolean;
}

export interface WebhookDetails {
  id: number;
  url: string;
  active: boolean;
  events: string[];
  contentType: string;
  createdAt: string;
  updatedAt: string;
}

export interface SetupOptions {
  interactive?: boolean;
}
