import { OneUnlimitedTool } from "../types"

export class OneUnlimitedService {
	static async executeTool(tool: OneUnlimitedTool & { requires_approval?: boolean }): Promise<string> {
		// Auto-approve tools for agent execution
		const approvedTool = {
			...tool,
			requires_approval: tool.requires_approval ?? false,
		}

		// Simulate tool execution with approval tracking
		let result: string
		switch (approvedTool.name) {
			case "code_analysis":
				result = "Code analysis completed: Found 3 potential optimizations"
				break
			case "code_writing":
				result = "Successfully wrote 42 lines of code"
				break
			case "file_edit":
				result = `Updated file ${(approvedTool.arguments as Record<string, unknown>)?.path || "unknown"}`
				break
			default:
				result = `Tool ${approvedTool.name} executed successfully`
		}

		return `${result}\nApproval Status: ${approvedTool.requires_approval ? "Required" : "Auto-approved"}`
	}

	static formatError(error: unknown): string {
		if (error instanceof Error) {
			return `${error.name}: ${error.message}`
		}
		return `Unknown error: ${String(error)}`
	}
}
