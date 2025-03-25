/**
 * 团队领导代理
 *
 * 负责任务分析、计划创建和任务分配
 */

import { BaseAgent } from "../BaseAgent"
import { AgentConfig, TaskPlan, TaskStep, ToolResult, OneUnlimitedTool } from "../types"
import { getAgentManager } from "../management/AgentManager"
import { MessageType } from "../messaging/MessageBus"
import { OneUnlimitedService } from "../../../services/OneUnlimitedService"
import * as vscode from "vscode"

interface PendingTask {
	id: string
	description: string
	assignedTo: string
	status: "pending" | "in-progress" | "completed" | "failed"
	startTime?: number
	endTime?: number
}

export class TeamLeaderAgent extends BaseAgent {
	private pendingTasks: Map<string, PendingTask> = new Map()
	private currentPlan?: TaskPlan
	private taskHistory: TaskPlan[] = []
	private agentManager = getAgentManager()

	constructor(config: Partial<AgentConfig>) {
		super({
			...config,
			id: config.id || "team-leader",
			name: config.name || "团队领导",
			description: config.description || "负责任务分析、计划创建和任务分配",
			capabilities: [...(config.capabilities || []), "task_planning", "team_coordination"],
		})
	}

	/**
	 * 处理新任务请求
	 */
	public async handleTask(taskDescription: string): Promise<void> {
		try {
			await this.analyzeTask(taskDescription)
			await this.executeCurrentPlan()
		} catch (error) {
			this.logAction(`任务处理失败: ${this.formatError(error)}`)
			vscode.window.showErrorMessage(`任务处理失败: ${this.formatError(error)}`)
		}
	}

	/**
	 * 分析任务并创建执行计划
	 */
	async analyzeTask(taskDescription: string): Promise<TaskPlan> {
		this.logAction(`分析任务: ${taskDescription}`)

		// 创建任务ID
		const taskId = `task-${Date.now()}`

		// 识别任务所需的技能
		const requiredSkills = await this.identifyRequiredSkills(taskDescription)
		this.logAction(`识别所需技能: ${requiredSkills.join(", ")}`)

		// 创建任务步骤
		const steps = await this.createTaskSteps(taskDescription, requiredSkills)

		// 构建完整计划
		const plan: TaskPlan = {
			id: `plan-${Date.now()}`,
			objective: taskDescription,
			steps: steps,
		}

		// 保存当前计划
		this.currentPlan = plan
		this.taskHistory.push(plan)

		// 通知用户计划已创建
		vscode.window.showInformationMessage(`已创建任务计划: ${taskDescription}`)

		return plan
	}

	/**
	 * 执行特定任务步骤
	 */
	async executeStep(step: TaskStep): Promise<ToolResult> {
		this.logAction(`执行步骤: ${step.description}`)

		// 更新步骤状态
		step.status = "in-progress"

		// 记录到待处理任务
		const pendingTask: PendingTask = {
			id: step.id,
			description: step.description,
			assignedTo: step.assignedTo,
			status: "in-progress",
			startTime: Date.now(),
		}
		this.pendingTasks.set(step.id, pendingTask)

		try {
			// 寻找适合执行此步骤的代理
			const agent = this.findAgentForStep(step)

			if (!agent) {
				throw new Error(`找不到适合执行步骤 "${step.description}" 的代理`)
			}

			// 分配任务给代理
			this.logAction(`将步骤 "${step.description}" 分配给 ${agent.name}`)

			// 通过消息总线分配任务
			this.messageBus.publish({
				id: `task-assignment-${Date.now()}`,
				type: MessageType.TASK_ASSIGNMENT,
				senderId: this.config.id,
				recipientId: agent.id,
				channelId: this.config.teamChannel || "general",
				content: {
					stepId: step.id,
					description: step.description,
					planObjective: this.currentPlan?.objective,
					requiredTools: step.requiredTools,
				},
				timestamp: Date.now(),
			})

			// 模拟等待代理完成任务
			// 在实际实现中，我们会等待代理通过消息总线发送任务完成消息
			const result = await this.simulateAgentWork(agent.id, step)

			// 更新步骤状态和任务状态
			step.status = "completed"
			pendingTask.status = "completed"
			pendingTask.endTime = Date.now()

			return result
		} catch (error) {
			// 处理错误
			this.logAction(`执行步骤 "${step.description}" 时出错: ${this.formatError(error)}`)

			// 更新状态
			step.status = "failed"
			pendingTask.status = "failed"
			pendingTask.endTime = Date.now()

			return {
				success: false,
				message: `步骤执行失败: ${this.formatError(error)}`,
				output: JSON.stringify({ error: this.formatError(error) }),
			}
		}
	}

	/**
	 * 模拟代理执行步骤
	 */
	private async simulateAgentWork(agentId: string, step: TaskStep): Promise<ToolResult> {
		// 这个方法模拟代理工作
		// 在实际实现中，我们会等待真实代理的响应
		await new Promise((resolve) => setTimeout(resolve, 1000)) // 模拟工作延迟

		return {
			success: true,
			message: `步骤 "${step.description}" 已由代理 ${agentId} 完成`,
			output: JSON.stringify({
				stepId: step.id,
				completedBy: agentId,
				timestamp: new Date().toISOString(),
			}),
		}
	}

	/**
	 * 处理来自其他代理的状态更新
	 */
	protected handleStatusUpdate(message: any): void {
		if (message.content?.stepId && this.pendingTasks.has(message.content.stepId)) {
			const task = this.pendingTasks.get(message.content.stepId)!

			if (message.content.status) {
				task.status = message.content.status
			}

			if (message.content.status === "completed" || message.content.status === "failed") {
				task.endTime = Date.now()
			}

			this.logAction(`收到步骤 "${task.description}" 的状态更新: ${task.status}`)
		}
	}

	/**
	 * 获取任务执行进度
	 */
	public getTaskProgress(): { completed: number; total: number; progress: number } {
		if (!this.currentPlan) {
			return { completed: 0, total: 0, progress: 0 }
		}

		const total = this.currentPlan.steps.length
		const completed = this.currentPlan.steps.filter((step) => step.status === "completed").length

		return {
			completed,
			total,
			progress: total > 0 ? completed / total : 0,
		}
	}

	/**
	 * 确定何时处理消息
	 */
	protected override shouldProcessMessages(): boolean {
		// 团队领导对每条消息都立即响应
		return this.messageBuffer.length > 0
	}

	/**
	 * 生成响应
	 */
	protected override async generateResponse(context: string): Promise<string> {
		// 如果尚未创建计划，则分析任务并创建计划
		if (!this.currentPlan && context.trim().length > 0) {
			this.currentPlan = await this.analyzeTask(context)

			// 返回计划创建成功消息
			return `已创建任务计划:\n目标: ${this.currentPlan.objective}\n步骤数: ${this.currentPlan.steps.length}`
		}

		// 如果已有计划，则开始执行
		if (this.currentPlan) {
			return await this.executeCurrentPlan()
		}

		return `收到消息: ${context}`
	}

	/**
	 * 执行当前计划
	 */
	private async executeCurrentPlan(): Promise<string> {
		if (!this.currentPlan) {
			return "没有活动计划需要执行"
		}

		const plan = this.currentPlan
		const pendingSteps = plan.steps.filter((step) => step.status === "pending")

		if (pendingSteps.length === 0) {
			// 所有步骤已完成或正在进行
			const progress = this.getTaskProgress()
			return `计划执行中: ${progress.completed}/${progress.total} 步骤已完成 (${Math.round(progress.progress * 100)}%)`
		}

		// 开始执行下一个待处理步骤
		const nextStep = pendingSteps[0]
		const result = await this.executeStep(nextStep)

		if (result.success) {
			return `已执行步骤: ${nextStep.description}\n结果: ${result.message}`
		} else {
			return `步骤执行失败: ${nextStep.description}\n错误: ${result.message}`
		}
	}

	/**
	 * 识别任务所需的技能
	 */
	private async identifyRequiredSkills(taskDescription: string): Promise<string[]> {
		// 简化版本的技能识别逻辑
		const skills: string[] = []

		// 基于关键词的简单技能识别
		const skillKeywords: Record<string, string> = {
			UI: "ui_design",
			界面: "ui_design",
			设计: "ui_design",
			前端: "frontend_development",
			frontend: "frontend_development",
			后端: "backend_development",
			backend: "backend_development",
			API: "api_development",
			数据库: "database",
			database: "database",
			测试: "testing",
			test: "testing",
			架构: "architecture",
		}

		// 检查关键词
		for (const [keyword, skill] of Object.entries(skillKeywords)) {
			if (taskDescription.toLowerCase().includes(keyword.toLowerCase()) && !skills.includes(skill)) {
				skills.push(skill)
			}
		}

		// 总是包含基础技能
		if (skills.length === 0) {
			skills.push("frontend_development")
		}

		return skills
	}

	/**
	 * 创建任务步骤
	 */
	private async createTaskSteps(taskDescription: string, skills: string[]): Promise<TaskStep[]> {
		const steps: TaskStep[] = []

		// 添加需求分析步骤
		steps.push({
			id: `step-analysis-${Date.now()}`,
			description: "需求分析和任务分解",
			assignedTo: "architect",
			status: "pending",
			requiredTools: ["task-analyzer"],
			priority: 10, // 最高优先级
		})

		// 添加设计步骤
		if (skills.includes("ui_design")) {
			steps.push({
				id: `step-design-${Date.now()}`,
				description: "用户界面设计",
				assignedTo: "ui-designer",
				status: "pending",
				requiredTools: ["ui-design-tool"],
				priority: 8,
			})
		}

		// 添加前端开发步骤
		if (skills.includes("frontend_development")) {
			steps.push({
				id: `step-frontend-${Date.now()}`,
				description: "前端功能实现",
				assignedTo: "frontend-dev",
				status: "pending",
				requiredTools: ["code-writer"],
				priority: 6,
			})
		}

		// 添加后端开发步骤
		if (skills.includes("backend_development") || skills.includes("api_development")) {
			steps.push({
				id: `step-backend-${Date.now()}`,
				description: "后端功能实现",
				assignedTo: "backend-dev",
				status: "pending",
				requiredTools: ["code-writer"],
				priority: 6,
			})
		}

		// 添加测试步骤
		steps.push({
			id: `step-test-${Date.now()}`,
			description: "功能测试和质量验证",
			assignedTo: "qa-tester",
			status: "pending",
			requiredTools: ["test-runner"],
			priority: 4,
		})

		return steps
	}

	/**
	 * 查找合适的代理来执行步骤
	 */
	private findAgentForStep(step: TaskStep): { id: string; name: string } | null {
		// 在真实实现中，我们会使用代理管理器查找合适的代理
		// 这里为了演示，我们使用预设的映射关系
		const agentMapping: Record<string, { id: string; name: string }> = {
			architect: { id: "architect", name: "架构师" },
			"ui-designer": { id: "ui-designer", name: "UI设计师" },
			"frontend-dev": { id: "frontend-dev", name: "前端开发" },
			"backend-dev": { id: "backend-dev", name: "后端开发" },
			"qa-tester": { id: "qa-tester", name: "测试工程师" },
		}

		return agentMapping[step.assignedTo] || null
	}

	// 使用基类的formatError方法，不需要重复实现
}
