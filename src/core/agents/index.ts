/**
 * 多代理系统集成入口
 *
 * 将多代理系统集成到OneUnlimited扩展中
 */

import * as vscode from "vscode"
import { getAgentSystem } from "./AgentSystem"

/**
 * 初始化代理系统
 */
export async function initializeAgentSystem(context: vscode.ExtensionContext): Promise<void> {
	// 获取代理系统实例
	const agentSystem = getAgentSystem(context)

	// 初始化代理系统
	await agentSystem.initialize()

	// 创建状态栏项
	const statusBarItem = agentSystem.createStatusBarItem()

	// 注册清理操作
	context.subscriptions.push({
		dispose: () => {
			statusBarItem.dispose()
			agentSystem.dispose()
		},
	})

	// 输出初始化日志
	vscode.window.showInformationMessage("OneUnlimited 多代理系统已启动")

	return Promise.resolve()
}

// 全局上下文引用
let globalContext: vscode.ExtensionContext | undefined

/**
 * 设置全局扩展上下文
 * 在扩展激活时调用此函数
 */
export function setExtensionContext(context: vscode.ExtensionContext): void {
	globalContext = context
}

/**
 * 提交任务给代理系统
 */
export async function submitTaskToAgentSystem(taskDescription: string, context?: vscode.ExtensionContext): Promise<void> {
	// 使用传入的上下文或全局上下文
	const ctx = context || globalContext

	if (!ctx) {
		throw new Error("无法访问OneUnlimited扩展上下文，请先调用setExtensionContext或提供上下文参数")
	}

	const agentSystem = getAgentSystem(ctx)
	await agentSystem.submitTask(taskDescription)
}

/**
 * 显示代理系统UI
 */
export function showAgentSystemUI(context?: vscode.ExtensionContext): void {
	// 使用传入的上下文或全局上下文
	const ctx = context || globalContext

	if (!ctx) {
		throw new Error("无法访问OneUnlimited扩展上下文，请先调用setExtensionContext或提供上下文参数")
	}

	// 这里不需要获取agentSystem实例，因为命令已经注册
	vscode.commands.executeCommand("oneunlimited.openAgentSystem")
}

// 导出各个组件
export * from "./types"
export * from "./BaseAgent"
export { getAgentManager, type RegisteredAgent } from "./management/AgentManager"
export * from "./messaging/MessageBus"
export * from "./specialized/TeamLeaderAgent"
export * from "./ui/AgentSystemView"
export * from "./AgentSystem"
