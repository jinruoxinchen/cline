import { Disposable } from 'vscode';
import { IAgent, AgentConfig, AgentMessage } from '../interfaces/IAgent';
import { ToolResult } from '../../../types';

export abstract class BaseAgent implements IAgent {
  constructor(
    public readonly id: string,
    public readonly role: string,
    protected config: AgentConfig
  ) {}

  async initialize(): Promise<void> {
    // Common initialization logic
  }

  abstract handleMessage(message: AgentMessage): Promise<ToolResult>;

  dispose() {
    // Common cleanup logic
  }
}
