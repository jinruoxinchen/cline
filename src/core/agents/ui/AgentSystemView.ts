/**
 * 多代理系统视图
 *
 * 负责将多代理系统集成到VSCode界面中
 */

import * as vscode from "vscode"
import { getAgentManager, RegisteredAgent } from "../management/AgentManager"
import { getMessageBus, MessageType, AgentMessage } from "../messaging/MessageBus"
import { TeamLeaderAgent } from "../specialized/TeamLeaderAgent"
import path from "path"
import fs from "fs"

export class AgentSystemView {
	private static instance: AgentSystemView
	private teamLeader: TeamLeaderAgent | null = null
	private agentManager = getAgentManager()
	private messageHistory: AgentMessage[] = []
	private messageBus = getMessageBus()

	public static getInstance(context: vscode.ExtensionContext): AgentSystemView {
		if (!AgentSystemView.instance) {
			AgentSystemView.instance = new AgentSystemView(context)
		}
		return AgentSystemView.instance
	}

	constructor(private readonly context: vscode.ExtensionContext) {}

	private updateView(): void {
		// 实际实现应更新WebView界面
		const uiUpdateMessage: AgentMessage = {
			id: `ui-update-${Date.now()}`,
			type: MessageType.UI_UPDATE,
			senderId: "agent-system-view",
			channelId: "ui-updates",
			content: JSON.stringify(this.messageHistory),
			timestamp: Date.now(),
			priority: 1, // 设置较高的优先级确保UI及时更新
		}
		this.messageBus.publish(uiUpdateMessage)
	}

	public submitTask(taskDescription: string): void {
		if (this.teamLeader) {
			this.teamLeader.handleTask(taskDescription)
		}
	}

	/**
	 * 处理来自WebView的消息
	 */
	private handleWebviewMessage(message: any): void {
		switch (message.command) {
			case "submitTask":
				this.submitTask(message.text)
				break

			case "enableAgent":
				this.agentManager.setAgentEnabled(message.agentId, true)
				break

			case "disableAgent":
				this.agentManager.setAgentEnabled(message.agentId, false)
				break

			case "clearMessages":
				this.messageHistory = []
				this.updateView()
				break

			case "quickAction":
				this.handleQuickAction(message.action)
				break
		}
	}

	/**
	 * 处理快速操作
	 */
	public registerTeamLeader(leader: TeamLeaderAgent): void {
		this.teamLeader = leader
	}

	public registerAgent(agent: RegisteredAgent): void {
		this.agentManager.registerAgent(agent.agent)
	}

	public show(): void {
		// 实际实现应显示WebView界面
		vscode.window.showInformationMessage("Agent System View activated")
	}

	public dispose(): void {
		// 清理资源
		this.teamLeader = null
		this.messageHistory = []
	}

	private handleQuickAction(action: string): void {
		if (!this.teamLeader) {
			return
		}

		// 创建符合AgentMessage类型的消息
		const message: AgentMessage = {
			id: `quickaction-${Date.now()}`,
			type: MessageType.NOTIFICATION,
			senderId: "system-ui",
			channelId: "user-actions",
			content: `快速操作: ${action}`,
			timestamp: Date.now(),
		}

		this.teamLeader.handleMessage(message)
	}
}
