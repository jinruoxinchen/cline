import { Disposable, Event, EventEmitter } from "vscode"
import { IAgent, AgentConfig, AgentContext } from "./interfaces/IAgent"
import { AgentMessageBus } from "./AgentMessageBus"
import { AgentRoleManager } from "./AgentRoleManager"

export class AgentCoordinator implements Disposable {
	private agents: Map<string, IAgent> = new Map()
	private readonly _onDidChangeAgents = new EventEmitter<void>()
	readonly onDidChangeAgents: Event<void> = this._onDidChangeAgents.event

	constructor(
		private messageBus: AgentMessageBus,
		private roleManager: AgentRoleManager,
	) {}

	async createAgentCluster(configs: AgentConfig[]): Promise<IAgent[]> {
		const agents = await Promise.all(
			configs.map(async (config) => {
				const agent = await this.roleManager.instantiateAgent(config)
				this.agents.set(agent.id, agent)
				this.messageBus.registerAgent(agent)
				return agent
			}),
		)

		this._onDidChangeAgents.fire()
		return agents
	}

	getAgent(id: string): IAgent | undefined {
		return this.agents.get(id)
	}

	terminateAgent(id: string): void {
		const agent = this.agents.get(id)
		if (agent) {
			agent.dispose()
			this.agents.delete(id)
			this.messageBus.unregisterAgent(id)
			this._onDidChangeAgents.fire()
		}
	}

	dispose() {
		this.agents.forEach((agent) => agent.dispose())
		this.agents.clear()
		this.messageBus.dispose()
	}
}
