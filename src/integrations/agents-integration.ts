/**
 * OneUnlimited 多代理系统集成
 *
 * 将多代理系统与OneUnlimited扩展集成
 */

import * as vscode from "vscode"
import { initializeAgentSystem, setExtensionContext } from "../core/agents"
import { Logger } from "../services/logging/Logger"

/**
 * 初始化多代理系统
 * 在扩展激活时调用
 */
export async function setupAgentSystem(context: vscode.ExtensionContext): Promise<void> {
	try {
		// 设置扩展上下文
		setExtensionContext(context)

		// 初始化代理系统
		await initializeAgentSystem(context)

		// 注册菜单命令和快捷键
		registerAgentSystemCommands(context)

		Logger.log("OneUnlimited 多代理系统已成功初始化")
		return Promise.resolve()
	} catch (error) {
		Logger.log(`初始化多代理系统失败: ${error instanceof Error ? error.message : String(error)}`)
		vscode.window.showErrorMessage(`初始化多代理系统失败: ${error instanceof Error ? error.message : String(error)}`)
		return Promise.reject(error)
	}
}

/**
 * 注册与多代理系统相关的命令
 */
function registerAgentSystemCommands(context: vscode.ExtensionContext): void {
	// 已经在AgentSystem.ts中注册了主要命令
	// 这里添加其他命令

	// 快速提交任务命令
	const quickSubmitCommand = vscode.commands.registerCommand("oneunlimited.quickAgentTask", async () => {
		const taskDescription = await vscode.window.showInputBox({
			prompt: "输入要提交给代理团队的任务",
			placeHolder: "例如: 设计并实现一个响应式导航栏组件",
		})

		if (taskDescription) {
			vscode.commands.executeCommand("oneunlimited.submitAgentTask", taskDescription)
		}
	})

	// 运行多代理系统演示命令
	const demoCommand = vscode.commands.registerCommand("oneunlimited.runAgentSystemDemo", async () => {
		Logger.log("正在运行多代理系统演示...")

		try {
			// 导入演示模块
			const { runAgentSystemDemo } = require("../test/agent-system-demo")

			// 显示信息提示
			vscode.window.showInformationMessage("OneUnlimited 多代理系统演示已启动")

			// 运行演示
			await runAgentSystemDemo()
		} catch (error) {
			Logger.log(`运行演示时出错: ${error instanceof Error ? error.message : String(error)}`)
			vscode.window.showErrorMessage("运行多代理系统演示失败")
		}
	})

	context.subscriptions.push(quickSubmitCommand, demoCommand)
}
