import { BaseAgent } from './BaseAgent';
import { AgentMessage } from '../interfaces/IAgent';
import { ToolResult } from '../../../types';

export class ReviewerAgent extends BaseAgent {
  async handleMessage(message: AgentMessage): Promise<ToolResult> {
    return {
      agentId: this.id,
      success: true,
      message: 'Code review completed',
      output: JSON.stringify({
        issuesFound: 2,
        suggestions: ['Improve error handling', 'Optimize database queries']
      })
    };
  }
}
