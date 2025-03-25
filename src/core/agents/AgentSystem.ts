/**
 * 多代理系统入口点
 *
 * 负责初始化和协调整个代理系统
 */

import * as vscode from "vscode"
import { getAgentManager } from "./management/AgentManager"
import { TeamLeaderAgent } from "./specialized/TeamLeaderAgent"
import { AgentSystemView } from "./ui/AgentSystemView"
import { AgentConfig, TaskPlan, TaskStep, ToolResult, RegisteredAgent } from "./types"
import { BaseAgent } from "./BaseAgent"

// 导入专业代理
// 在未来可以根据需要添加更多专业代理的导入

/**
 * 代理系统主类
 */
export class AgentSystem {
	private static instance: AgentSystem
	private context: vscode.ExtensionContext
	private agentManager = getAgentManager()
	private teamLeader: TeamLeaderAgent
	private agentSystemView: AgentSystemView
	private initialized = false
	private disposables: vscode.Disposable[] = []

	private constructor(context: vscode.ExtensionContext) {
		this.context = context

		// 初始化UI视图
		this.agentSystemView = AgentSystemView.getInstance(context)

		// 创建团队领导代理
		this.teamLeader = new TeamLeaderAgent({
			id: "team-leader",
			name: "团队领导",
			description: "负责任务分析、计划创建和任务分配",
			teamChannel: "general",
			capabilities: ["task_planning", "team_coordination"],
		})
	}

	public static getInstance(context: vscode.ExtensionContext): AgentSystem {
		if (!AgentSystem.instance) {
			AgentSystem.instance = new AgentSystem(context)
		}
		return AgentSystem.instance
	}

	/**
	 * 初始化代理系统
	 */
	public async initialize(): Promise<void> {
		if (this.initialized) {
			return
		}

		try {
			// 注册团队领导代理
			this.agentSystemView.registerTeamLeader(this.teamLeader)

			// 注册常用的专业代理
			await this.registerDefaultAgents()

			// 注册命令
			this.registerCommands()

			this.initialized = true

			vscode.window.showInformationMessage("OneUnlimited 多代理系统已初始化")
		} catch (error) {
			vscode.window.showErrorMessage(`初始化多代理系统失败: ${this.formatError(error)}`)
		}
	}

	/**
	 * 注册默认的专业代理
	 */
	private async registerDefaultAgents(): Promise<void> {
		// 这里可以根据需要创建和注册各种专业代理
		// 在真实实现中，可能会从配置中加载代理列表

		// 架构师代理
		this.registerSpecializedAgent({
			id: "architect",
			name: "架构师",
			description: "系统设计和技术选型",
			teamChannel: "general",
			capabilities: ["architecture", "system_design", "technology_selection"],
		})

		// UI设计师代理
		this.registerSpecializedAgent({
			id: "ui-designer",
			name: "UI设计师",
			description: "用户界面设计",
			teamChannel: "general",
			capabilities: ["ui_design", "ux", "prototyping"],
		})

		// 前端开发代理
		this.registerSpecializedAgent({
			id: "frontend-dev",
			name: "前端开发",
			description: "实现客户端功能",
			teamChannel: "general",
			capabilities: ["frontend_development", "javascript", "react"],
		})

		// 后端开发代理
		this.registerSpecializedAgent({
			id: "backend-dev",
			name: "后端开发",
			description: "实现服务器端功能",
			teamChannel: "general",
			capabilities: ["backend_development", "api_design", "database"],
		})

		// 测试工程师代理
		this.registerSpecializedAgent({
			id: "qa-tester",
			name: "测试工程师",
			description: "测试和质量保证",
			teamChannel: "general",
			capabilities: ["testing", "qa", "automation"],
		})
	}

	/**
	 * 注册专业代理
	 */
	private registerSpecializedAgent(config: AgentConfig): void {
		// 创建一个临时的基础代理
		// 在真实实现中，我们会创建特定类型的代理
		const agent: RegisteredAgent = {
			id: config.id,
			name: config.name,
			description: config.description || `${config.name}专业代理`,
			agent: new GenericSpecializedAgent(config),
			capabilities: config.capabilities,
			enabled: true,
		}
		this.agentSystemView.registerAgent(agent)
	}

	/**
	 * 注册命令
	 */
	private registerCommands(): void {
		// 打开代理系统视图
		const openCommand = vscode.commands.registerCommand("oneunlimited.openAgentSystem", () => {
			this.agentSystemView.show()
		})

		// 提交任务
		const submitTaskCommand = vscode.commands.registerCommand("oneunlimited.submitAgentTask", async () => {
			const taskDescription = await vscode.window.showInputBox({
				prompt: "输入要提交给代理团队的任务",
				placeHolder: "例如: 设计并实现一个响应式导航栏组件",
			})

			if (taskDescription) {
				this.agentSystemView.submitTask(taskDescription)
			}
		})

		this.disposables.push(openCommand, submitTaskCommand)
	}

	/**
	 * 创建VSCode状态栏项
	 */
	public createStatusBarItem(): vscode.StatusBarItem {
		const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
		statusBarItem.text = "$(organization) 多代理系统"
		statusBarItem.tooltip = "打开OneUnlimited多代理系统"
		statusBarItem.command = "oneunlimited.openAgentSystem"
		statusBarItem.show()

		this.disposables.push(statusBarItem)

		return statusBarItem
	}

	/**
	 * 提交任务
	 */
	public async submitTask(taskDescription: string): Promise<void> {
		await this.agentSystemView.submitTask(taskDescription)
	}

	/**
	 * 格式化错误
	 */
	private formatError(error: unknown): string {
		if (error instanceof Error) {
			return error.message
		}
		return String(error)
	}

	/**
	 * 销毁资源
	 */
	public dispose(): void {
		this.disposables.forEach((d) => d.dispose())
		this.agentSystemView.dispose()
	}
}

/**
 * 通用专业代理实现
 *
 * 这是一个简单的专业代理实现，用于演示目的
 * 在真实实现中，我们会为每种代理类型创建特定的类
 */
class GenericSpecializedAgent extends BaseAgent {
	constructor(config: AgentConfig) {
		super(config)
	}

	async analyzeTask(taskDescription: string): Promise<TaskPlan> {
		return {
			id: `plan-${Date.now()}`,
			objective: taskDescription,
			steps: [
				{
					id: `step-${Date.now()}`,
					description: `执行任务: ${taskDescription}`,
					assignedTo: this.config.id,
					status: "pending" as "pending" | "in-progress" | "completed" | "failed",
				},
			],
		}
	}

	async executeStep(step: TaskStep): Promise<ToolResult> {
		return {
			success: true,
			message: `步骤 ${step.id} 已执行`,
			output: JSON.stringify({
				stepId: step.id,
				agentId: this.config.id,
				result: "任务完成",
			}),
		}
	}

	protected override shouldProcessMessages() {
		return this.messageBuffer.length > 0
	}

	protected override async generateResponse(context: string): Promise<string> {
		return `来自${this.config.name}的响应: 已处理消息 "${context}"`
	}
}

// 导出获取实例的函数
export function getAgentSystem(context: vscode.ExtensionContext): AgentSystem {
	return AgentSystem.getInstance(context)
}
