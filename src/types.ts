import { JSONSchema7 } from "json-schema"

export interface AgentConfig {
	id: string
	name: string
	capabilities: string[]
	description?: string
	teamChannel?: string
	defaultTools?: string[]
}

export interface ToolParameter {
	name: string
	type: string
	description: string
	required: boolean
}

export interface OneUnlimitedTool {
	id: string
	name: string
	description: string
	parameters: ToolParameter[]
	arguments?: Record<string, unknown>
	command?: string
	requiresApproval?: boolean
}

export interface TaskStep {
	id: string
	description: string
	assignedTo: string
	status: "pending" | "in-progress" | "completed"
	requiredTools?: string[]
}

export interface TaskPlan {
	id: string
	objective: string
	steps: TaskStep[]
}

export interface ToolResult {
	agentId: string
	success: boolean
	message: string
	output: string
}

export interface ToolBlock {
	type: string
	content: string
}
