/**
 * 代理管理器
 *
 * 负责创建、注册和管理代理的生命周期
 */

import * as vscode from "vscode"
import { EventEmitter } from "events"
import { BaseAgent } from "../BaseAgent"
import { AgentConfig } from "../types"
import { getMessageBus } from "../messaging/MessageBus"

export interface RegisteredAgent {
	id: string
	name: string
	description?: string
	agent: BaseAgent
	capabilities: string[]
	enabled: boolean
}

export class AgentManager {
	private static instance: AgentManager
	private agents: Map<string, RegisteredAgent>
	private eventEmitter: EventEmitter
	private messageBus = getMessageBus()

	private constructor() {
		this.agents = new Map()
		this.eventEmitter = new EventEmitter()
	}

	public static getInstance(): AgentManager {
		if (!AgentManager.instance) {
			AgentManager.instance = new AgentManager()
		}
		return AgentManager.instance
	}

	/**
	 * 注册代理到管理器
	 */
	public registerAgent(agent: BaseAgent): void {
		const config = agent.getConfig()

		if (this.agents.has(config.id)) {
			throw new Error(`代理ID '${config.id}' 已存在，请使用唯一ID注册代理`)
		}

		const registeredAgent: RegisteredAgent = {
			id: config.id,
			name: config.name,
			description: config.description || "",
			agent,
			enabled: true,
			capabilities: config.capabilities || [],
		}

		this.agents.set(config.id, registeredAgent)
		this.eventEmitter.emit("agent-registered", registeredAgent)

		vscode.window.showInformationMessage(`已注册代理: ${config.name} (${config.id})`)
	}

	/**
	 * 批量注册多个代理
	 */
	public registerAgents(agents: BaseAgent[]): void {
		agents.forEach((agent) => this.registerAgent(agent))
	}

	/**
	 * 注销代理
	 */
	public unregisterAgent(agentId: string): boolean {
		if (!this.agents.has(agentId)) {
			return false
		}

		const agent = this.agents.get(agentId)!
		this.agents.delete(agentId)
		this.eventEmitter.emit("agent-unregistered", agent)

		vscode.window.showInformationMessage(`已注销代理: ${agent.name} (${agent.id})`)
		return true
	}

	/**
	 * 获取单个代理
	 */
	public getAgent(agentId: string): RegisteredAgent | undefined {
		return this.agents.get(agentId)
	}

	/**
	 * 获取所有已注册代理
	 */
	public getAllAgents(): RegisteredAgent[] {
		return Array.from(this.agents.values())
	}

	/**
	 * 基于能力查找代理
	 */
	public findAgentsByCapability(capability: string): RegisteredAgent[] {
		return this.getAllAgents().filter((agent) => agent.enabled && agent.capabilities.includes(capability))
	}

	/**
	 * 启用或禁用代理
	 */
	public setAgentEnabled(agentId: string, enabled: boolean): boolean {
		const agent = this.agents.get(agentId)
		if (!agent) {
			return false
		}

		agent.enabled = enabled
		this.eventEmitter.emit("agent-state-changed", agent)

		vscode.window.showInformationMessage(`代理 ${agent.name} (${agent.id}) 已${enabled ? "启用" : "禁用"}`)
		return true
	}

	/**
	 * 监听代理事件
	 */
	public on(
		event: "agent-registered" | "agent-unregistered" | "agent-state-changed",
		listener: (agent: RegisteredAgent) => void,
	): void {
		this.eventEmitter.on(event, listener)
	}

	/**
	 * 取消监听代理事件
	 */
	public off(
		event: "agent-registered" | "agent-unregistered" | "agent-state-changed",
		listener: (agent: RegisteredAgent) => void,
	): void {
		this.eventEmitter.off(event, listener)
	}

	/**
	 * 为代理更新配置
	 */
	public updateAgentConfig(agentId: string, configUpdate: Partial<AgentConfig>): boolean {
		const registeredAgent = this.agents.get(agentId)
		if (!registeredAgent) {
			return false
		}

		// 更新配置
		const agent = registeredAgent.agent
		agent.updateConfig(configUpdate)

		// 同步更新已注册的代理信息
		const updatedConfig = agent.getConfig()
		registeredAgent.name = updatedConfig.name
		registeredAgent.description = updatedConfig.description || ""
		registeredAgent.capabilities = updatedConfig.capabilities || []

		this.eventEmitter.emit("agent-state-changed", registeredAgent)
		return true
	}
}

// 导出获取实例的工厂函数
export function getAgentManager(): AgentManager {
	return AgentManager.getInstance()
}
