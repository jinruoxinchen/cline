/**
 * LLM API客户端
 *
 * 提供与DeepSeek和Claude API的集成
 */

const axios = require("axios")
const fs = require("fs")
const path = require("path")
const os = require("os")

// API配置
let apiConfig = {
	deepseek: {
		apiKey: process.env.DEEPSEEK_API_KEY || "",
		baseUrl: "https://api.deepseek.com/v1",
		model: "deepseek-chat", // 根据实际可用模型调整
	},
	claude: {
		apiKey: process.env.CLAUDE_API_KEY || "",
		baseUrl: process.env.CLAUDE_BASE_URL || "https://api.anthropic.com/v1",
		model: "claude-3-7-sonnet-20240307", // 默认使用Claude 3.7 Sonnet
	},
}

// 尝试从配置文件加载API密钥
function loadApiKeys() {
	try {
		// 尝试从以下位置加载配置文件
		const configLocations = [path.join(process.cwd(), ".env.local"), path.join(os.homedir(), ".oneunlimited", "config.json")]

		for (const configPath of configLocations) {
			if (fs.existsSync(configPath)) {
				console.log(`从配置文件加载API密钥: ${configPath}`)

				if (configPath.endsWith(".json")) {
					const config = JSON.parse(fs.readFileSync(configPath, "utf8"))
					if (config.deepseekApiKey) apiConfig.deepseek.apiKey = config.deepseekApiKey
					if (config.claudeApiKey) apiConfig.claude.apiKey = config.claudeApiKey
					if (config.deepseekModel) apiConfig.deepseek.model = config.deepseekModel
					if (config.claudeModel) apiConfig.claude.model = config.claudeModel
					if (config.claudeBaseUrl) apiConfig.claude.baseUrl = config.claudeBaseUrl
				} else if (configPath.endsWith(".env.local")) {
					const content = fs.readFileSync(configPath, "utf8")
					const lines = content.split("\n")

					for (const line of lines) {
						const [key, value] = line.split("=")
						if (key === "DEEPSEEK_API_KEY") apiConfig.deepseek.apiKey = value.trim()
						if (key === "CLAUDE_API_KEY") apiConfig.claude.apiKey = value.trim()
						if (key === "DEEPSEEK_MODEL") apiConfig.deepseek.model = value.trim()
						if (key === "CLAUDE_MODEL") apiConfig.claude.model = value.trim()
						if (key === "CLAUDE_BASE_URL") apiConfig.claude.baseUrl = value.trim()
					}
				}

				// 如果找到了配置文件，停止搜索
				break
			}
		}
	} catch (error) {
		console.error("加载API密钥时出错:", error)
	}
}

// 手动设置API密钥
function setApiKeys(deepseekApiKey, claudeApiKey, claudeBaseUrl) {
	if (deepseekApiKey) apiConfig.deepseek.apiKey = deepseekApiKey
	if (claudeApiKey) apiConfig.claude.apiKey = claudeApiKey
	if (claudeBaseUrl) apiConfig.claude.baseUrl = claudeBaseUrl
	console.log("API密钥已设置")
}

// 设置模型
function setModels(deepseekModel, claudeModel) {
	if (deepseekModel) apiConfig.deepseek.model = deepseekModel
	if (claudeModel) apiConfig.claude.model = claudeModel
	console.log("模型已设置")
}

// 设置API基础URL
function setBaseUrls(deepseekBaseUrl, claudeBaseUrl) {
	if (deepseekBaseUrl) apiConfig.deepseek.baseUrl = deepseekBaseUrl
	if (claudeBaseUrl) apiConfig.claude.baseUrl = claudeBaseUrl
	console.log("API基础URL已设置")
}

// DeepSeek API
async function callDeepSeekApi(systemPrompt, userMessage, temperature = 0.7, maxTokens = 2000) {
	if (!apiConfig.deepseek.apiKey) {
		throw new Error("未设置DeepSeek API密钥。请使用setApiKeys()设置密钥或设置DEEPSEEK_API_KEY环境变量。")
	}

	try {
		// 添加请求超时和重试配置
		const axiosInstance = axios.create({
			timeout: 30000, // 30秒超时
			maxRetries: 2, // 最多重试2次
			retryDelay: 1000, // 重试间隔1秒
		})

		console.log(`正在连接DeepSeek API (${apiConfig.deepseek.baseUrl})...`)
		console.log(`使用模型: ${apiConfig.deepseek.model}`)

		const response = await axiosInstance.post(
			`${apiConfig.deepseek.baseUrl}/chat/completions`,
			{
				model: apiConfig.deepseek.model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userMessage },
				],
				temperature: temperature,
				max_tokens: maxTokens,
			},
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiConfig.deepseek.apiKey}`,
				},
			},
		)

		return response.data.choices[0].message.content
	} catch (error) {
		console.error("调用DeepSeek API时出错:", error.response?.data || error.message)

		// 处理特定的网络错误
		if (error.code === "ECONNRESET" || error.message.includes("socket hang up")) {
			throw new Error(`DeepSeek API连接被重置或中断。这可能是由于网络不稳定或服务器负载过高。请稍后重试。`)
		}

		if (error.code === "ECONNABORTED") {
			throw new Error(`DeepSeek API请求超时。请检查网络连接和API服务器状态。`)
		}

		if (error.code === "ECONNREFUSED") {
			throw new Error(`无法连接到DeepSeek API服务器(${apiConfig.deepseek.baseUrl})。请检查URL是否正确。`)
		}

		// 处理API特定错误
		if (error.response?.data?.error) {
			const apiError = error.response.data.error
			if (apiError.code === "rate_limit_exceeded") {
				throw new Error(`DeepSeek API速率限制已超出。请稍后重试或减少请求频率。`)
			}

			if (apiError.code === "invalid_api_key") {
				throw new Error(`DeepSeek API密钥无效。请检查您的API密钥。`)
			}
		}

		throw new Error(`DeepSeek API错误: ${error.response?.data?.error?.message || error.message}`)
	}
}

// DeepSeek API - 流式模式，但使用普通模式模拟
async function callDeepSeekApiStream(systemPrompt, userMessage, onChunk, temperature = 0.7, maxTokens = 2000) {
	if (!apiConfig.deepseek.apiKey) {
		throw new Error("未设置DeepSeek API密钥。请使用setApiKeys()设置密钥或设置DEEPSEEK_API_KEY环境变量。")
	}

	try {
		console.log("DeepSeek API流式请求中...")
		const result = await callDeepSeekApi(systemPrompt, userMessage, temperature, maxTokens)

		// 模拟流式输出，每次输出几个字符
		let currentPos = 0
		const chunkSize = 3 // 每次输出几个字符
		let fullContent = ""

		while (currentPos < result.length) {
			const end = Math.min(currentPos + chunkSize, result.length)
			const chunk = result.substring(currentPos, end)
			fullContent += chunk

			if (onChunk) {
				onChunk(chunk, fullContent)
			}

			// 小延迟使输出看起来更自然
			await new Promise((resolve) => setTimeout(resolve, 10))
			currentPos = end
		}

		return fullContent
	} catch (error) {
		console.error("调用DeepSeek API时出错:", error)
		throw error
	}
}

// Claude API
async function callClaudeApi(systemPrompt, userMessage, temperature = 0.7, maxTokens = 2000) {
	if (!apiConfig.claude.apiKey) {
		throw new Error("未设置Claude API密钥。请使用setApiKeys()设置密钥或设置CLAUDE_API_KEY环境变量。")
	}

	try {
		// 添加请求超时和重试
		const axiosInstance = axios.create({
			timeout: 30000, // 30秒超时
		})

		console.log(`正在连接Claude API (${apiConfig.claude.baseUrl})...`)
		console.log(`使用模型: ${apiConfig.claude.model}`)

		// 检查302.AI用户是否需要特殊处理
		const headers = {
			"Content-Type": "application/json",
			"x-api-key": apiConfig.claude.apiKey,
			"anthropic-version": "2023-06-01",
		}

		const response = await axiosInstance.post(
			`${apiConfig.claude.baseUrl}/messages`,
			{
				model: apiConfig.claude.model,
				system: systemPrompt,
				messages: [{ role: "user", content: userMessage }],
				temperature: temperature,
				max_tokens: maxTokens,
			},
			{ headers },
		)

		return response.data.content[0].text
	} catch (error) {
		console.error("调用Claude API时出错:", error.response?.data || error.message)

		// 针对302.AI的特殊错误处理
		if (error.response?.data?.error?.message?.includes("Account credential expired")) {
			throw new Error(`Claude API凭证已过期，请重新登录302.AI获取新的API密钥。错误: ${error.response.data.error.message}`)
		}

		// 针对网络错误的详细诊断
		if (error.code === "ECONNABORTED") {
			throw new Error(`Claude API请求超时。请检查网络连接和API服务器状态。`)
		}

		if (error.code === "ECONNREFUSED") {
			throw new Error(`无法连接到Claude API服务器(${apiConfig.claude.baseUrl})。请检查URL是否正确。`)
		}

		throw new Error(`Claude API错误: ${error.response?.data?.error?.message || error.message}`)
	}
}

// Claude API - 流式模式，但使用普通模式模拟
async function callClaudeApiStream(systemPrompt, userMessage, onChunk, temperature = 0.7, maxTokens = 2000) {
	if (!apiConfig.claude.apiKey) {
		throw new Error("未设置Claude API密钥。请使用setApiKeys()设置密钥或设置CLAUDE_API_KEY环境变量。")
	}

	try {
		console.log("Claude API流式请求中...")
		const result = await callClaudeApi(systemPrompt, userMessage, temperature, maxTokens)

		// 模拟流式输出，每次输出几个字符
		let currentPos = 0
		const chunkSize = 3 // 每次输出几个字符
		let fullContent = ""

		while (currentPos < result.length) {
			const end = Math.min(currentPos + chunkSize, result.length)
			const chunk = result.substring(currentPos, end)
			fullContent += chunk

			if (onChunk) {
				onChunk(chunk, fullContent)
			}

			// 小延迟使输出看起来更自然
			await new Promise((resolve) => setTimeout(resolve, 10))
			currentPos = end
		}

		return fullContent
	} catch (error) {
		console.error("调用Claude API时出错:", error)
		throw error
	}
}

// 通用LLM调用函数
async function callLLM(provider, systemPrompt, userMessage, temperature = 0.7, maxTokens = 2000) {
	try {
		if (provider === "deepseek") {
			return await callDeepSeekApi(systemPrompt, userMessage, temperature, maxTokens)
		} else if (provider === "claude") {
			return await callClaudeApi(systemPrompt, userMessage, temperature, maxTokens)
		} else {
			throw new Error(`不支持的LLM提供商: ${provider}`)
		}
	} catch (error) {
		console.error(`调用${provider} API时出错:`, error)

		// 如果主要提供商失败，尝试备用提供商
		if (provider === "deepseek" && apiConfig.claude.apiKey) {
			console.log("DeepSeek API调用失败，尝试使用Claude API...")
			return await callClaudeApi(systemPrompt, userMessage, temperature, maxTokens)
		} else if (provider === "claude" && apiConfig.deepseek.apiKey) {
			console.log("Claude API调用失败，尝试使用DeepSeek API...")
			return await callDeepSeekApi(systemPrompt, userMessage, temperature, maxTokens)
		}

		throw error
	}
}

// 通用LLM流式调用函数
async function callLLMStream(provider, systemPrompt, userMessage, onChunk, temperature = 0.7, maxTokens = 2000) {
	try {
		if (provider === "deepseek") {
			return await callDeepSeekApiStream(systemPrompt, userMessage, onChunk, temperature, maxTokens)
		} else if (provider === "claude") {
			return await callClaudeApiStream(systemPrompt, userMessage, onChunk, temperature, maxTokens)
		} else {
			throw new Error(`不支持的LLM提供商: ${provider}`)
		}
	} catch (error) {
		console.error(`调用${provider}流式API时出错:`, error)

		// 如果主要提供商失败，尝试备用提供商
		if (provider === "deepseek" && apiConfig.claude.apiKey) {
			console.log("DeepSeek流式API调用失败，尝试使用Claude API...")
			return await callClaudeApiStream(systemPrompt, userMessage, onChunk, temperature, maxTokens)
		} else if (provider === "claude" && apiConfig.deepseek.apiKey) {
			console.log("Claude流式API调用失败，尝试使用DeepSeek API...")
			return await callDeepSeekApiStream(systemPrompt, userMessage, onChunk, temperature, maxTokens)
		}

		throw error
	}
}

// 导出函数
module.exports = {
	loadApiKeys,
	setApiKeys,
	setModels,
	setBaseUrls,
	callDeepSeekApi,
	callDeepSeekApiStream,
	callClaudeApi,
	callClaudeApiStream,
	callLLM,
	callLLMStream,
	apiConfig, // 导出配置，便于调试
}
