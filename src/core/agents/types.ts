/**
 * 多代理系统类型定义
 */
import { BaseAgent } from "./BaseAgent"

// 代理配置接口
export interface AgentConfig {
	id: string // 代理唯一标识符
	name: string // 代理名称
	description?: string // 代理描述
	teamChannel?: string // 代理所属团队频道
	capabilities: string[] // 代理能力标签列表
	defaultTools?: string[] // 代理默认可用工具
}

// 注册代理接口
export interface RegisteredAgent {
	id: string
	name: string
	description: string | undefined
	agent: BaseAgent
	capabilities: string[]
	enabled: boolean
}

// 任务计划接口
export interface TaskPlan {
	id: string // 计划唯一标识符
	objective: string // 任务目标描述
	steps: TaskStep[] // 任务步骤列表
}

// 任务步骤接口
export interface TaskStep {
	id: string // 步骤唯一标识符
	description: string // 步骤描述
	assignedTo: string // 分配给的代理ID
	status: "pending" | "in-progress" | "completed" | "failed" // 步骤状态
	requiredTools?: string[] // 所需工具列表
	estimatedDuration?: number // 预计完成时间(毫秒)
	priority?: number // 优先级(1-10)，默认为5
}

// 工具参数接口
export interface ToolParameter {
	name: string // 参数名称
	type: string // 参数类型
	description: string // 参数描述
	required: boolean // 参数是否必需
}

// 工具接口
export interface OneUnlimitedTool {
	id: string // 工具唯一标识符
	name: string // 工具名称
	description: string // 工具描述
	parameters: ToolParameter[] // 工具参数列表
	arguments?: Record<string, unknown> // 工具参数值
	command?: string // 执行命令
	requiresApproval?: boolean // 是否需要用户批准
}

// 工具执行结果接口
export interface ToolResult {
	success: boolean // 执行是否成功
	message: string // 执行结果消息
	output: string // 输出内容
}

// 工具块接口
export interface ToolBlock {
	type: string // 块类型
	content: string // 块内容
}
