import { Anthropic } from "@anthropic-ai/sdk"
import { withRetry } from "../retry"
import {
	ApiHandlerOptions,
	ModelInfo,
	oneunlimitedDefaultModelId,
	OneUnlimitedModelId,
	oneunlimitedModels,
} from "../../shared/api"
import { ApiHandler } from "../index"
import { ApiStream, ApiStreamUsageChunk } from "../transform/stream"

export class OneUnlimitedHandler implements ApiHandler {
	private options: ApiHandlerOptions
	private lastUsage?: ApiStreamUsageChunk

	constructor(options: ApiHandlerOptions) {
		this.options = options
	}

	@withRetry()
	async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
		this.lastUsage = undefined

		// 使用适当的API模型ID
		const model = this.getModel()

		// 设置模拟的使用数据
		this.lastUsage = {
			type: "usage",
			inputTokens: 0,
			outputTokens: 0,
			totalCost: 0,
		}

		// 立即产生使用统计
		yield this.lastUsage

		// 产生一个简单的文本响应，指示这是模拟的响应
		yield {
			type: "text",
			text: "这是OneUnlimited模型的模拟响应。为了进行实际测试，请使用有效的API提供程序，如Claude或OpenAI。",
		}
	}

	getModel(): { id: OneUnlimitedModelId; info: ModelInfo } {
		const modelId = this.options.apiModelId
		if (modelId && modelId in oneunlimitedModels) {
			const id = modelId as OneUnlimitedModelId
			return { id, info: oneunlimitedModels[id] }
		}
		return {
			id: oneunlimitedDefaultModelId,
			info: oneunlimitedModels[oneunlimitedDefaultModelId],
		}
	}

	async getApiStreamUsage(): Promise<ApiStreamUsageChunk | undefined> {
		return this.lastUsage
	}
}
