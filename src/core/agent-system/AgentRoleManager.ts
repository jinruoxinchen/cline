import { IAgent, AgentConfig } from "./interfaces/IAgent"
import { ArchitectAgent } from "./agents/ArchitectAgent"
import { DeveloperAgent } from "./agents/DeveloperAgent"
import { ReviewerAgent } from "./agents/ReviewerAgent"
import { QAAgent } from "./agents/QAAgent"

export class AgentRoleManager {
	private roleConfigs = new Map<string, AgentConfig>([
		[
			"architect",
			{
				id: "architect",
				role: "architect",
				capabilities: ["task-decomposition", "architecture-design"],
				context: {
					workspaceAccess: true,
					filePermissions: ["read", "write"],
					maxTokenBudget: 4000,
					allowedTools: ["planning", "analysis"],
				},
			},
		],
		[
			"developer",
			{
				id: "developer",
				role: "developer",
				capabilities: ["code-generation", "debugging"],
				context: {
					workspaceAccess: true,
					filePermissions: ["read", "write"],
					maxTokenBudget: 3000,
					allowedTools: ["coding", "execute"],
				},
			},
		],
		[
			"reviewer",
			{
				id: "reviewer",
				role: "reviewer",
				capabilities: ["code-review", "best-practices"],
				context: {
					workspaceAccess: true,
					filePermissions: ["read"],
					maxTokenBudget: 2000,
					allowedTools: ["analysis", "review"],
				},
			},
		],
		[
			"qa",
			{
				id: "qa",
				role: "qa",
				capabilities: ["testing", "validation"],
				context: {
					workspaceAccess: true,
					filePermissions: ["read"],
					maxTokenBudget: 2000,
					allowedTools: ["testing", "validation"],
				},
			},
		],
	])

	async instantiateAgent(config: AgentConfig): Promise<IAgent> {
		switch (config.role.toLowerCase()) {
			case "architect":
				return new ArchitectAgent(config.id, config.role, config)
			case "developer":
				return new DeveloperAgent(config.id, config.role, config)
			case "reviewer":
				return new ReviewerAgent(config.id, config.role, config)
			case "qa":
				return new QAAgent(config.id, config.role, config)
			default:
				throw new Error(`Unknown agent role: ${config.role}`)
		}
	}
}
