import { Event, EventEmitter, Disposable } from "vscode"
import { IAgent, AgentMessage } from "./interfaces/IAgent"

export class AgentMessageBus implements Disposable {
	private agents = new Map<string, IAgent>()
	private readonly _onMessage = new EventEmitter<{ senderId: string; message: AgentMessage }>()
	readonly onMessage = this._onMessage.event

	registerAgent(agent: IAgent): void {
		this.agents.set(agent.id, agent)
	}

	unregisterAgent(agentId: string): void {
		this.agents.delete(agentId)
	}

	async sendMessage(senderId: string, recipientId: string, message: AgentMessage): Promise<boolean> {
		const agent = this.agents.get(recipientId)
		if (!agent) return false

		try {
			await agent.handleMessage(message)
			return true
		} catch (error) {
			console.error(`Message delivery failed to ${recipientId}:`, error)
			return false
		}
	}

	broadcastMessage(senderId: string, message: AgentMessage): void {
		this._onMessage.fire({ senderId, message })
	}

	dispose() {
		this.agents.clear()
		this._onMessage.dispose()
	}
}
