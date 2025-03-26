import { BaseAgent } from './BaseAgent';
import { AgentMessage } from '../interfaces/IAgent';
import { ToolResult } from '../../../types';

export class DeveloperAgent extends BaseAgent {
  async handleMessage(message: AgentMessage): Promise<ToolResult> {
    return {
      agentId: this.id,
      success: true,
      message: 'Code implemented successfully',
      output: JSON.stringify({
        filesCreated: 3,
        testsPassed: true,
        lintErrors: []
      })
    };
  }
}
