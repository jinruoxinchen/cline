import { Disposable } from "vscode"
import { ToolResult } from "../../../types"

export interface AgentConfig {
	id: string
	role: string
	capabilities: string[]
	context: AgentContext
}

export interface AgentContext {
	workspaceAccess: boolean
	filePermissions: string[]
	maxTokenBudget: number
	allowedTools: string[]
}

export interface IAgent extends Disposable {
	readonly id: string
	readonly role: string
	initialize(): Promise<void>
	handleMessage(message: AgentMessage): Promise<ToolResult>
}

export type AgentMessage = {
	type: "task" | "response" | "error"
	content: string
	metadata?: Record<string, unknown>
}
