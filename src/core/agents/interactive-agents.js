/**
 * Interactive Agent Architecture Demo with Real LLM Integration
 *
 * 使用真实的LLM API (DeepSeek和Claude) 实现的多代理协作系统
 */

const readline = require("readline")
const { loadApiKeys, setApiKeys, setModels, callLLM, callLLMStream } = require("./utils/llm-client")
const fs = require("fs")
const path = require("path")
const os = require("os")

// 创建配置目录
const configDir = path.join(os.homedir(), ".oneunlimited")
if (!fs.existsSync(configDir)) {
	fs.mkdirSync(configDir, { recursive: true })
}

// 默认配置文件路径
const configPath = path.join(configDir, "config.json")

// 获取或创建配置
function getConfig() {
	if (fs.existsSync(configPath)) {
		try {
			return JSON.parse(fs.readFileSync(configPath, "utf8"))
		} catch (error) {
			console.error("读取配置文件失败:", error)
		}
	}
	return {
		deepseekApiKey: "",
		claudeApiKey: "",
		claudeBaseUrl: "",
		deepseekModel: "deepseek-chat",
		claudeModel: "claude-3-7-sonnet-20240307",
		preferredProvider: "claude",
	}
}

// 保存配置
function saveConfig(config) {
	try {
		fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
		console.log(`配置已保存到: ${configPath}`)
	} catch (error) {
		console.error("保存配置失败:", error)
	}
}

// LLMAgent - 使用真实LLM的代理基类
class LLMAgent {
	constructor(config) {
		this.id = config.id || "llm-agent"
		this.name = config.name || "LLM Agent"
		this.description = config.description || "An LLM-powered agent"
		this.teamChannel = config.teamChannel || "general"
		this.capabilities = config.capabilities || []
		this.messageBuffer = []
		this.provider = config.provider || "claude" // 默认使用Claude
		this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt()
		this.temperature = config.temperature || 0.7
	}

	getDefaultSystemPrompt() {
		return `你是一个名为${this.name}的AI助手，ID为${this.id}。你的专长是${this.description}。
你的职责是专注于你的专业领域，提供专业、准确和有用的回应。
你是一个更大的代理团队的一部分，专注于协作解决复杂问题。`
	}

	async handleMessage(message, sender) {
		console.log(`[${this.id}] 收到消息: ${message}`)
		this.messageBuffer.push(message)

		// 立即处理消息
		await this.processMessageBuffer()
		return Promise.resolve()
	}

	async processMessageBuffer() {
		const context = this.messageBuffer.join("\n")
		this.messageBuffer = []

		try {
			const response = await this.generateResponse(context)

			// 广播响应到频道
			this.broadcastResponse(response)
		} catch (error) {
			console.error(`[${this.id}] 生成响应失败:`, error)
			this.broadcastResponse(`很抱歉，我处理此消息时遇到了问题: ${error.message}`)
		}
	}

	async executeTool(tool) {
		console.log(`[${this.id}] 执行工具: ${tool.name}`)
		return Promise.resolve(`工具 ${tool.name} 执行成功`)
	}

	broadcastResponse(response) {
		console.log(`[频道:${this.teamChannel}] ${this.id}: ${response}`)
	}

	async generateResponse(context) {
		try {
			const userMessage = `请针对以下内容提供专业的${this.name}观点和建议:\n\n${context}`

			console.log(`[${this.id}] 正在生成响应...`)

			// 使用流式API并实时显示进度
			let fullResponse = ""

			// 定义处理流式数据的回调
			const handleChunk = (chunk, _) => {
				process.stdout.write(chunk)
				fullResponse += chunk
			}

			// 打印标识符，显示代理正在响应
			process.stdout.write(`\n[${this.id}] 响应: `)

			// 使用流式LLM API
			await callLLMStream(this.provider, this.systemPrompt, userMessage, handleChunk, this.temperature)

			// 添加换行以便于阅读
			console.log()

			return fullResponse
		} catch (error) {
			console.error("生成响应失败:", error)
			return `抱歉，我无法处理这个请求。(错误: ${error.message})`
		}
	}
}

// TeamLeaderAgent - 团队领导代理
class TeamLeaderAgent extends LLMAgent {
	constructor(config) {
		super(config)
		this.pendingTasks = new Map()
		this.agents = new Map()
		this.taskHistory = []
	}

	getDefaultSystemPrompt() {
		return `你是团队领导，一个专业的项目协调者和任务分解专家。
你的职责是分析任务需求，将复杂任务分解为可管理的小步骤，并将这些步骤分配给合适的专业代理。
你需要识别任务所需的技能，创建详细的执行计划，并协调团队工作。

对于每个任务，你应该:
1. 仔细分析需求
2. 确定所需技能和专业知识
3. 创建步骤清晰的执行计划
4. 为每个步骤分配合适的团队成员
5. 提供明确的任务描述和上下文

请以结构化格式呈现你的计划，包括任务目标、所需技能、执行步骤及负责人。`
	}

	registerAgent(agent) {
		this.agents.set(agent.id, agent)
		console.log(`[${this.id}] 注册代理: ${agent.id} (${agent.name})`)
	}

	async generateResponse(context) {
		console.log(`[${this.id}] 为任务创建计划: ${context}`)

		try {
			// 使用LLM生成任务分析和计划
			const userMessage = `请分析以下任务，识别所需技能，并创建详细的执行计划：\n\n${context}
      
请按照以下JSON格式返回计划:
{
  "objective": "任务目标",
  "skills": ["技能1", "技能2", ...],
  "steps": [
    {
      "id": "step-1",
      "description": "步骤描述",
      "assignedTo": "负责的代理ID",
      "status": "pending"
    },
    ...
  ]
}`

			// 打印标识符
			process.stdout.write(`\n[${this.id}] 正在分析任务并创建计划...\n`)

			// 使用流式API，但收集完整响应用于解析
			let response = ""

			await callLLMStream(
				this.provider,
				this.systemPrompt,
				userMessage,
				(chunk, _) => {
					process.stdout.write(chunk)
					response += chunk
				},
				0.2, // 较低温度以获得更一致的结构化输出
			)

			// 添加换行以便于阅读
			console.log("\n")

			// 解析LLM返回的JSON计划
			let plan
			try {
				// 提取JSON部分（防止LLM在JSON前后添加额外文本）
				const jsonMatch = response.match(/\{[\s\S]*\}/)
				if (jsonMatch) {
					plan = JSON.parse(jsonMatch[0])
				} else {
					throw new Error("无法从响应中提取JSON计划")
				}
			} catch (parseError) {
				console.error("解析计划失败:", parseError)
				console.log("原始响应:", response)

				// 创建一个默认计划
				plan = {
					objective: context,
					skills: ["frontend_development", "ui_design"],
					steps: [
						{
							id: `step-analysis-${Date.now()}`,
							description: "需求分析和任务分解",
							assignedTo: "architect",
							status: "pending",
						},
						{
							id: `step-design-${Date.now()}`,
							description: "组件设计和用户界面规划",
							assignedTo: "ui-designer",
							status: "pending",
						},
						{
							id: `step-implement-${Date.now()}`,
							description: "实现核心功能",
							assignedTo: "frontend-dev",
							status: "pending",
						},
					],
				}
			}

			// 保存任务到历史记录
			this.taskHistory.push({
				id: `task-${Date.now()}`,
				description: context,
				plan: plan,
				timestamp: new Date().toISOString(),
			})

			console.log(`\n[${this.id}] 计划已创建:`)
			console.log(JSON.stringify(plan, null, 2))

			// 延迟一会再分配任务
			setTimeout(() => {
				this.delegateTasks(plan)
			}, 1000)

			// 返回有关计划的消息
			return `我已分析任务"${plan.objective}"并创建了执行计划。
需要的技能: ${plan.skills.join(", ")}
包含 ${plan.steps.length} 个执行步骤，将分配给团队成员执行。`
		} catch (error) {
			console.error("生成计划失败:", error)
			return `抱歉，我在创建计划时遇到了问题。错误: ${error.message}`
		}
	}

	async delegateTasks(plan) {
		console.log(`\n[${this.id}] 开始分配任务...`)

		// 处理计划中的每个步骤
		for (const step of plan.steps) {
			// 找到合适的代理
			const agentId = this.findBestAgentForTask(step, plan.skills)

			if (agentId && this.agents.has(agentId)) {
				const agent = this.agents.get(agentId)
				const task = {
					id: step.id,
					description: step.description,
					planId: plan.id,
					objective: plan.objective,
				}

				console.log(`[${this.id}] 将任务分配给 ${agent.name} (${agent.id}): ${task.description}`)
				await agent.handleMessage(`任务分配: ${task.description}\n上下文: ${plan.objective}`, this)

				// 添加延迟，使任务分配更有序
				await new Promise((resolve) => setTimeout(resolve, 1500))
			} else {
				console.log(`[${this.id}] 警告: 找不到适合执行 "${step.description}" 的代理`)
			}
		}

		console.log(`\n[${this.id}] 所有任务已分配，团队正在协作处理...`)
	}

	findBestAgentForTask(step, skills) {
		// 简单映射步骤分配给的代理ID
		const agentMapping = {
			architecture_agent: "architect",
			ui_designer_agent: "ui-designer",
			frontend_developer_agent: "frontend-dev",
			backend_developer_agent: "backend-dev",
			qa_agent: "qa-tester",
		}

		// 返回映射的代理ID或原始分配
		return agentMapping[step.assignedTo] || step.assignedTo
	}
}

// 专业代理类 - UI设计师
class UiDesignerAgent extends LLMAgent {
	getDefaultSystemPrompt() {
		return `你是UI设计师，一个专业的用户界面和用户体验设计专家。
你擅长于创建美观、实用且符合现代设计标准的界面设计。

当收到设计任务时，你应该:
1. 分析用户需求和设计目标
2. 提出具体的设计方案和视觉元素
3. 考虑响应式设计和跨设备兼容性
4. 遵循当前UI/UX最佳实践
5. 提供详细的设计规范，包括布局、颜色方案、间距和元素样式

请尽可能提供详细的设计描述，包括具体的CSS值、颜色代码和布局方案，让开发人员能够准确实现你的设计。`
	}
}

// 专业代理类 - 前端开发者
class FrontendDeveloperAgent extends LLMAgent {
	getDefaultSystemPrompt() {
		return `你是前端开发者，一个专业的用户界面实现专家。
你擅长使用HTML、CSS和JavaScript（特别是React和其他现代框架）创建交互式、高性能的用户界面。

当收到开发任务时，你应该:
1. 分析需求和UI设计规范
2. 编写高质量、可维护的代码
3. 确保代码遵循现代最佳实践和设计模式
4. 考虑性能、可访问性和浏览器兼容性
5. 提供完整的代码实现，包括必要的HTML、CSS和JavaScript

请提供可以直接使用的完整代码示例，包括注释，以便其他团队成员理解你的实现方法。`
	}
}

// 专业代理类 - 后端开发者
class BackendDeveloperAgent extends LLMAgent {
	getDefaultSystemPrompt() {
		return `你是后端开发者，一个专业的服务器端和API开发专家。
你擅长设计和实现安全、高效、可扩展的后端服务和数据API。

当收到开发任务时，你应该:
1. 分析需求和数据模型
2. 设计合理的API端点和服务架构
3. 编写高质量、安全的服务器端代码
4. 考虑性能、安全性和错误处理
5. 提供完整的代码实现，包括数据验证和错误处理

请提供可以直接使用的完整代码示例，包括路由定义、控制器逻辑、数据验证和错误处理，使前端开发者能够轻松集成你的API。`
	}
}

// 专业代理类 - 测试工程师
class QATesterAgent extends LLMAgent {
	getDefaultSystemPrompt() {
		return `你是测试工程师，一个专业的软件质量保证专家。
你擅长设计测试计划、编写测试用例和执行各种类型的测试，以确保软件质量。

当收到测试任务时，你应该:
1. 分析需求和功能规范
2. 设计全面的测试计划
3. 编写详细的测试用例
4. 识别潜在的缺陷和改进机会
5. 提出对质量和用户体验的建议

请提供全面的测试报告，包括测试结果、发现的问题和改进建议，以帮助团队提高产品质量。`
	}
}

// 专业代理类 - 架构师
class ArchitectAgent extends LLMAgent {
	getDefaultSystemPrompt() {
		return `你是架构师，一个专业的软件架构和系统设计专家。
你擅长设计可扩展、可维护的软件系统，选择合适的技术栈，并定义清晰的代码组织结构。

当收到设计任务时，你应该:
1. 分析业务需求和技术约束
2. 提出清晰的系统架构和组件设计
3. 选择合适的技术栈和框架
4. 考虑性能、可扩展性、安全性和维护性
5. 提供详细的架构文档和技术规范

请提供全面的架构文档，包括系统组件、数据流、技术选择理由和实现建议，以指导开发团队的工作。`
	}
}

// 交互式CLI演示
async function runInteractiveDemo() {
	console.log("\n")
	console.log("==================================================")
	console.log("|     OneUnlimited 多代理系统交互演示 (LLM集成版)    |")
	console.log("==================================================")
	console.log("\n欢迎使用OneUnlimited多代理系统演示！")
	console.log("此版本使用真实的LLM API (DeepSeek和Claude) 实现代理。")

	// 加载配置
	loadApiKeys() // 确保先加载API配置

	let config = getConfig()
	console.log("当前API配置:")
	console.log(
		`- Claude API: ${config.claudeApiKey ? "已配置" : "未配置"} ${config.claudeBaseUrl ? "(Base URL: " + config.claudeBaseUrl + ")" : ""}`,
	)
	console.log(`- DeepSeek API: ${config.deepseekApiKey ? "已配置" : "未配置"}`)
	console.log(`- 首选提供商: ${config.preferredProvider}`)
	console.log(`- Claude模型: ${config.claudeModel || "claude-3-7-sonnet-20240307"}`)

	// 设置读取行接口
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})

	// 如果没有配置API密钥，请求用户输入
	if (!config.deepseekApiKey && !config.claudeApiKey) {
		console.log("\n需要设置至少一个LLM API密钥才能继续。")

		// 请求Claude API密钥
		const claudeApiKey = await new Promise((resolve) => {
			rl.question("请输入Claude API密钥 (或按Enter跳过): ", (answer) => {
				resolve(answer.trim())
			})
		})

		// 请求DeepSeek API密钥
		const deepseekApiKey = await new Promise((resolve) => {
			rl.question("请输入DeepSeek API密钥 (或按Enter跳过): ", (answer) => {
				resolve(answer.trim())
			})
		})

		// 请求Claude API Base URL
		const claudeBaseUrl = await new Promise((resolve) => {
			rl.question("请输入Claude API 基础URL (默认: https://api.anthropic.com/v1): ", (answer) => {
				resolve(answer.trim() || "https://api.anthropic.com/v1")
			})
		})

		// 更新配置
		if (claudeApiKey) config.claudeApiKey = claudeApiKey
		if (deepseekApiKey) config.deepseekApiKey = deepseekApiKey
		if (claudeBaseUrl) config.claudeBaseUrl = claudeBaseUrl

		// 选择首选提供商
		if (claudeApiKey && deepseekApiKey) {
			const preferredProvider = await new Promise((resolve) => {
				rl.question("选择首选LLM提供商 (claude/deepseek): ", (answer) => {
					resolve(answer.toLowerCase().startsWith("d") ? "deepseek" : "claude")
				})
			})
			config.preferredProvider = preferredProvider
		} else if (claudeApiKey) {
			config.preferredProvider = "claude"
		} else if (deepseekApiKey) {
			config.preferredProvider = "deepseek"
		} else {
			console.log("\n错误: 未提供任何API密钥，无法继续。")
			rl.close()
			return
		}

		// 保存配置
		saveConfig(config)
	}

	// 设置API配置
	setApiKeys(config.deepseekApiKey, config.claudeApiKey, config.claudeBaseUrl)
	setModels(config.deepseekModel, config.claudeModel)

	console.log(`\n已配置LLM API (首选提供商: ${config.preferredProvider})`)
	console.log("\n当前可用的代理团队:")
	console.log("- 团队领导 (协调和任务分解)")
	console.log("- UI设计师 (用户界面设计)")
	console.log("- 前端开发 (实现客户端功能)")
	console.log("- 后端开发 (实现服务器端功能)")
	console.log("- 架构师 (系统设计和技术选型)")
	console.log("- 测试工程师 (测试和质量保证)")

	// 创建代理团队
	const teamLeader = new TeamLeaderAgent({
		id: "team-leader",
		name: "团队领导",
		description: "协调团队并分配任务",
		teamChannel: "project-channel",
		capabilities: ["planning", "coordination"],
		provider: config.preferredProvider,
	})

	const uiDesigner = new UiDesignerAgent({
		id: "ui-designer",
		name: "UI设计师",
		description: "设计用户界面和用户体验",
		teamChannel: "project-channel",
		capabilities: ["ui_design", "ux", "prototyping"],
		provider: config.preferredProvider,
	})

	const frontendDev = new FrontendDeveloperAgent({
		id: "frontend-dev",
		name: "前端开发者",
		description: "实现客户端界面和功能",
		teamChannel: "project-channel",
		capabilities: ["frontend", "javascript", "react"],
		provider: config.preferredProvider,
	})

	const backendDev = new BackendDeveloperAgent({
		id: "backend-dev",
		name: "后端开发者",
		description: "实现服务器端功能和API",
		teamChannel: "project-channel",
		capabilities: ["backend", "node", "database"],
		provider: config.preferredProvider,
	})

	const qaTester = new QATesterAgent({
		id: "qa-tester",
		name: "测试工程师",
		description: "测试功能和质量保证",
		teamChannel: "project-channel",
		capabilities: ["testing", "qa", "automation"],
		provider: config.preferredProvider,
	})

	const architect = new ArchitectAgent({
		id: "architect",
		name: "架构师",
		description: "系统设计和技术选型",
		teamChannel: "project-channel",
		capabilities: ["architecture", "system_design", "technology_selection"],
		provider: config.preferredProvider,
	})

	// 向团队领导注册所有代理
	teamLeader.registerAgent(uiDesigner)
	teamLeader.registerAgent(frontendDev)
	teamLeader.registerAgent(backendDev)
	teamLeader.registerAgent(qaTester)
	teamLeader.registerAgent(architect)

	// 示例任务
	const sampleTasks = [
		"设计并实现一个响应式导航栏组件，具有下拉菜单功能",
		"创建一个用户登录表单，包含表单验证和错误处理",
		"开发一个产品列表页面，支持筛选、排序和分页功能",
		"实现一个用户数据管理API，包含CRUD操作",
		"设计一个移动优先的电子商务购物车界面",
	]

	console.log("\n示例任务:")
	sampleTasks.forEach((task, index) => {
		console.log(`${index + 1}. ${task}`)
	})

	const askForTask = () => {
		rl.question("\n请输入您的任务描述 (或选择示例任务编号 1-5)，输入 q 退出: ", async (answer) => {
			if (answer.toLowerCase() === "q") {
				console.log("\n感谢使用OneUnlimited多代理系统演示！")
				rl.close()
				return
			}

			let taskDescription = answer

			// 检查用户是否输入了示例任务编号
			if (/^[1-5]$/.test(answer)) {
				const index = parseInt(answer) - 1
				taskDescription = sampleTasks[index]
			}

			console.log(`\n收到任务: "${taskDescription}"`)
			console.log("\n开始处理任务...")

			try {
				// 使用团队领导处理任务
				await teamLeader.handleMessage(taskDescription)

				// 等待任务完成
				console.log("\n等待任务完成...")
				await new Promise((resolve) => setTimeout(resolve, 10000))

				console.log("\n\n任务处理完成！")
				console.log("=================================")
				console.log("团队已协作完成任务的各个方面，包括:")
				console.log("- 架构和需求分析")
				console.log("- UI/UX设计")
				console.log("- 前端实现")
				console.log("- 后端开发 (如果需要)")
				console.log("- 质量测试")
				console.log("=================================")
			} catch (error) {
				console.error("处理任务时出错:", error)
			}

			// 请求另一个任务
			askForTask()
		})
	}

	// 启动交互循环
	askForTask()
}

// 运行演示
runInteractiveDemo().catch(console.error)
