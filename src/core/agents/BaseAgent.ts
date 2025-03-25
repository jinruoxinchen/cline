/**
 * 抽象基础代理类
 *
 * 所有专业代理都从此类派生
 */

import { AgentConfig, OneUnlimitedTool, TaskPlan, TaskStep, ToolResult } from "./types"
import { getMessageBus, MessageType, AgentMessage } from "./messaging/MessageBus"
import { OneUnlimitedService } from "../../services/OneUnlimitedService"
import * as vscode from "vscode"

export abstract class BaseAgent {
	public config: AgentConfig
	protected messageBuffer: AgentMessage[] = []
	protected messageBus = getMessageBus()
	protected unsubscribeFunctions: (() => void)[] = []

	constructor(config: Partial<AgentConfig>) {
		// 设置默认配置，并合并传入的配置
		this.config = {
			id: config.id || `agent-${Date.now()}`,
			name: config.name || "Base Agent",
			description: config.description || "Default agent configuration",
			teamChannel: config.teamChannel || "general",
			capabilities: config.capabilities || [],
			defaultTools: config.defaultTools || [],
		}

		// 订阅团队频道消息
		if (this.config.teamChannel) {
			const unsubscribe = this.messageBus.subscribe(this.config.teamChannel, (message: AgentMessage) =>
				this.handleAgentMessage(message),
			)
			this.unsubscribeFunctions.push(unsubscribe)
		}
	}

	/**
	 * 获取代理配置
	 */
	public getConfig(): AgentConfig {
		return { ...this.config } // 返回配置副本以防止外部修改
	}

	/**
	 * 更新代理配置
	 */
	public updateConfig(configUpdate: Partial<AgentConfig>): void {
		// 更新配置
		this.config = {
			...this.config,
			...configUpdate,
		}

		// 如果团队频道更改，重新订阅
		if (configUpdate.teamChannel && configUpdate.teamChannel !== this.config.teamChannel) {
			// 取消之前的所有订阅
			this.unsubscribeAll()

			// 订阅新频道
			const unsubscribe = this.messageBus.subscribe(this.config.teamChannel!, (message: AgentMessage) =>
				this.handleAgentMessage(message),
			)
			this.unsubscribeFunctions.push(unsubscribe)
		}
	}

	/**
	 * 取消所有消息订阅
	 */
	private unsubscribeAll(): void {
		this.unsubscribeFunctions.forEach((unsubscribe) => unsubscribe())
		this.unsubscribeFunctions = []
	}

	/**
	 * 处理来自消息总线的代理消息
	 */
	protected handleAgentMessage(message: AgentMessage): void {
		// 忽略自己发送的消息以避免循环
		if (message.senderId === this.config.id) {
			return
		}

		// 处理特定的消息或者广播消息
		if (!message.recipientId || message.recipientId === this.config.id) {
			switch (message.type) {
				case MessageType.TASK_ASSIGNMENT:
					this.handleTaskAssignment(message)
					break
				case MessageType.INFORMATION_REQUEST:
					this.handleInformationRequest(message)
					break
				default:
					// 默认将消息内容加入消息缓冲区
					if (typeof message.content === "string") {
						this.messageBuffer.push(message)

						// 检查是否应该处理消息
						if (this.shouldProcessMessages()) {
							this.processMessageBuffer().catch((error) => {
								console.error(`[${this.config.id}] 处理消息时出错:`, error)
							})
						}
					}
			}
		}
	}

	/**
	 * 处理任务分配消息
	 */
	protected handleTaskAssignment(message: AgentMessage): void {
		// 默认实现是将任务添加到消息缓冲区
		if (typeof message.content.description === "string") {
			this.messageBuffer.push({
				id: `task-${Date.now()}`,
				type: MessageType.TASK_ASSIGNMENT,
				senderId: message.senderId,
				channelId: message.channelId,
				content: {
					description: message.content.description,
					originalMessageId: message.id,
				},
				timestamp: Date.now(),
			})

			if (this.shouldProcessMessages()) {
				this.processMessageBuffer().catch((error) => {
					console.error(`[${this.config.id}] 处理任务分配时出错:`, error)
				})
			}
		}
	}

	/**
	 * 处理信息请求消息
	 */
	protected handleInformationRequest(message: AgentMessage): void {
		// 子类可以覆盖此方法以处理特定的信息请求
		console.log(`[${this.config.id}] 收到信息请求: ${JSON.stringify(message.content)}`)
	}

	/**
	 * 处理文本消息
	 */
	async handleMessage(message: AgentMessage, sender?: BaseAgent): Promise<void> {
		this.messageBuffer.push(message)

		if (this.shouldProcessMessages()) {
			await this.processMessageBuffer()
		}
	}

	/**
	 * 确定是否应该处理消息缓冲区
	 * 子类必须实现此方法以定义自己的消息处理策略
	 */
	protected abstract shouldProcessMessages(): boolean

	/**
	 * 处理消息缓冲区
	 */
	protected async processMessageBuffer(): Promise<void> {
		const context = this.messageBuffer
			.map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
			.join("\n")
		this.messageBuffer = []

		const response = await this.generateResponse(context)
		this.broadcastResponse(response)
	}

	/**
	 * 执行工具
	 */
	public async executeTool(tool: OneUnlimitedTool): Promise<string> {
		try {
			const result = await OneUnlimitedService.executeTool({
				...tool,
				requires_approval: false,
			})

			this.logAction(`工具 ${tool.name} 执行成功`)
			return result
		} catch (error) {
			this.logAction(`工具执行失败: ${this.formatError(error)}`)
			throw error
		}
	}

	/**
	 * 格式化错误
	 */
	protected formatError(error: unknown): string {
		if (error instanceof Error) {
			return `${error.name}: ${error.message}`
		}
		return `未知错误: ${String(error)}`
	}

	/**
	 * 记录代理活动
	 */
	protected logAction(message: string): void {
		console.log(`[${this.config.id}] ${new Date().toISOString()} - ${message}`)

		// 使用消息总线发布日志消息
		this.messageBus.publish({
			id: `log-${Date.now()}`,
			type: MessageType.NOTIFICATION,
			senderId: this.config.id,
			channelId: this.config.teamChannel || "general",
			content: message,
			timestamp: Date.now(),
		})
	}

	/**
	 * 向团队频道广播响应
	 */
	protected broadcastResponse(response: string): void {
		this.messageBus.publish({
			id: `resp-${Date.now()}`,
			type: MessageType.RESULT,
			senderId: this.config.id,
			channelId: this.config.teamChannel || "general",
			content: response,
			timestamp: Date.now(),
		})

		// 显示可视化通知(可选)
		vscode.window.setStatusBarMessage(`${this.config.name}: ${this.truncateMessage(response)}`, 5000)
	}

	/**
	 * 截断长消息以用于状态栏显示
	 */
	private truncateMessage(message: string, maxLength: number = 50): string {
		if (message.length <= maxLength) {
			return message
		}
		return message.substring(0, maxLength - 3) + "..."
	}

	/**
	 * 发送请求给其他代理
	 */
	protected sendRequest(recipientId: string, content: any): void {
		this.messageBus.publish({
			id: `req-${Date.now()}`,
			type: MessageType.INFORMATION_REQUEST,
			senderId: this.config.id,
			recipientId,
			channelId: this.config.teamChannel || "general",
			content,
			timestamp: Date.now(),
		})
	}

	/**
	 * 发送响应给特定代理
	 */
	protected sendResponse(recipientId: string, content: any, correlationId?: string): void {
		this.messageBus.publish({
			id: `resp-${Date.now()}`,
			type: MessageType.INFORMATION_RESPONSE,
			senderId: this.config.id,
			recipientId,
			channelId: this.config.teamChannel || "general",
			content,
			timestamp: Date.now(),
			correlationId,
		})
	}

	/**
	 * 生成任务分析和计划
	 * 具体实现由派生类提供
	 */
	abstract analyzeTask(taskDescription: string): Promise<TaskPlan>

	/**
	 * 执行特定任务步骤
	 * 具体实现由派生类提供
	 */
	abstract executeStep(step: TaskStep): Promise<ToolResult>

	/**
	 * 根据上下文生成响应
	 * 具体实现由派生类提供
	 */
	protected abstract generateResponse(context: string): Promise<string>

	/**
	 * 清理资源
	 * 在代理被销毁前调用
	 */
	public dispose(): void {
		this.unsubscribeAll()
	}
}
