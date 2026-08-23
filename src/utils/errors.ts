export class CLIError extends Error {
  public readonly suggestions: string[];
  public readonly code: string;

  constructor(message: string, suggestions: string[] = [], code = 'CLI_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.suggestions = suggestions;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class GitHubAuthError extends CLIError {
  constructor(message: string, suggestions: string[] = []) {
    super(
      message,
      suggestions.length > 0
        ? suggestions
        : [
            'Run `auto-cicd-cli login` to re-authenticate.',
            'Ensure your GitHub OAuth App has valid permissions.',
            'Check your internet connection.',
          ],
      'GITHUB_AUTH_ERROR'
    );
  }
}

export class WebhookError extends CLIError {
  constructor(message: string, suggestions: string[] = []) {
    super(
      message,
      suggestions.length > 0
        ? suggestions
        : [
            'Ensure you have admin permissions on the selected repository.',
            'Verify that the repository exists and is accessible.',
            'Ensure the webhook URL is valid and publicly reachable.',
          ],
      'WEBHOOK_ERROR'
    );
  }
}

export class ValidationError extends CLIError {
  constructor(message: string, suggestions: string[] = []) {
    super(message, suggestions, 'VALIDATION_ERROR');
  }
}

export class ConfigError extends CLIError {
  constructor(message: string, suggestions: string[] = []) {
    super(
      message,
      suggestions.length > 0
        ? suggestions
        : ['Run `auto-cicd-cli setup` to reconfigure your environment.'],
      'CONFIG_ERROR'
    );
  }
}
