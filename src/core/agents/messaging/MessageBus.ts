/**
 * 消息总线系统
 *
 * 实现代理间通信的核心组件，采用发布-订阅模式
 */

import { EventEmitter } from "events"
import * as vscode from "vscode"

export enum MessageType {
	USER_INPUT = "USER_INPUT",
	AGENT_RESPONSE = "AGENT_RESPONSE",
	SYSTEM_ALERT = "SYSTEM_ALERT",
	TASK_UPDATE = "TASK_UPDATE",
	TASK_ASSIGNMENT = "task_assignment",
	STATUS_UPDATE = "status_update",
	INFORMATION_REQUEST = "information_request",
	INFORMATION_RESPONSE = "information_response",
	NOTIFICATION = "notification",
	RESULT = "result",
	COMMAND = "command",
	UI_UPDATE = "ui_update",
}

export interface AgentMessage {
	id: string // 消息唯一标识符
	type: MessageType // 消息类型
	senderId: string // 发送者ID
	recipientId?: string // 接收者ID，如果为空则广播
	channelId: string // 通信频道
	content: any // 消息内容
	timestamp: number // 发送时间戳
	correlationId?: string // 关联消息ID，用于请求-响应模式
	priority?: number // 消息优先级，默认为0
}

export class MessageBus {
	private static instance: MessageBus
	private eventEmitter: EventEmitter
	private messageHistory: Map<string, AgentMessage[]> // 按频道存储消息历史
	private diagnosticsChannel: vscode.OutputChannel

	private constructor() {
		this.eventEmitter = new EventEmitter()
		this.eventEmitter.setMaxListeners(100) // 设置足够大的监听器上限
		this.messageHistory = new Map()
		this.diagnosticsChannel = vscode.window.createOutputChannel("OneUnlimited Agents")
	}

	public static getInstance(): MessageBus {
		if (!MessageBus.instance) {
			MessageBus.instance = new MessageBus()
		}
		return MessageBus.instance
	}

	/**
	 * 发布消息到总线
	 */
	public publish(message: AgentMessage): void {
		// 设置缺失的字段
		const completeMessage: AgentMessage = {
			...message,
			id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
			timestamp: message.timestamp || Date.now(),
			priority: message.priority || 0,
		}

		// 存储消息到历史记录
		if (!this.messageHistory.has(message.channelId)) {
			this.messageHistory.set(message.channelId, [])
		}
		this.messageHistory.get(message.channelId)!.push(completeMessage)

		// 限制历史记录大小
		const channelHistory = this.messageHistory.get(message.channelId)!
		if (channelHistory.length > 1000) {
			// 保留最新的1000条消息
			this.messageHistory.set(message.channelId, channelHistory.slice(-1000))
		}

		// 发布到通信总线
		this.eventEmitter.emit(message.channelId, completeMessage)

		// 记录诊断信息
		this.logMessage(completeMessage)
	}

	/**
	 * 订阅特定频道的消息
	 */
	public subscribe(channelId: string, callback: (message: AgentMessage) => void): () => void {
		this.eventEmitter.on(channelId, callback)

		// 返回取消订阅函数
		return () => {
			this.eventEmitter.off(channelId, callback)
		}
	}

	/**
	 * 获取频道的消息历史
	 */
	public getChannelHistory(channelId: string): AgentMessage[] {
		return this.messageHistory.get(channelId) || []
	}

	/**
	 * 清空特定频道的历史记录
	 */
	public clearChannelHistory(channelId: string): void {
		this.messageHistory.set(channelId, [])
	}

	/**
	 * 记录诊断信息到输出通道
	 */
	private logMessage(message: AgentMessage): void {
		const timestamp = new Date(message.timestamp).toISOString()
		const recipient = message.recipientId || "BROADCAST"
		this.diagnosticsChannel.appendLine(
			`[${timestamp}] [${message.channelId}] ${message.senderId} -> ${recipient} (${message.type}): ${JSON.stringify(message.content)}`,
		)
	}
}

// 导出一个获取实例的工厂函数
export function getMessageBus(): MessageBus {
	return MessageBus.getInstance()
}
