/**
 * 更新API密钥配置工具
 *
 * 用于更新API密钥和URL，解决凭证过期或连接问题
 */

const fs = require("fs")
const path = require("path")
const os = require("os")
const readline = require("readline")

// 配置文件路径
const configDir = path.join(os.homedir(), ".oneunlimited")
const configPath = path.join(configDir, "config.json")

// 创建readline接口
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
})

// 确保配置目录存在
if (!fs.existsSync(configDir)) {
	fs.mkdirSync(configDir, { recursive: true })
	console.log(`已创建配置目录: ${configDir}`)
}

// 读取现有配置
function readConfig() {
	try {
		if (fs.existsSync(configPath)) {
			const content = fs.readFileSync(configPath, "utf8")
			try {
				// 尝试解析JSON
				return JSON.parse(content)
			} catch (e) {
				console.log("配置文件格式无效，将创建新配置")
				// 如果解析失败，尝试手动修复格式问题
				try {
					// 常见错误修复: 确保有开头和结尾的大括号
					let fixedContent = content
					if (!content.trim().startsWith("{")) {
						fixedContent = "{" + fixedContent
					}
					if (!content.trim().endsWith("}")) {
						fixedContent = fixedContent + "}"
					}
					// 尝试再次解析
					return JSON.parse(fixedContent)
				} catch (e2) {
					// 如果仍然失败，返回空对象
					return {}
				}
			}
		} else {
			return {}
		}
	} catch (error) {
		console.error("读取配置文件时出错:", error)
		return {}
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

// 主函数
async function main() {
	console.log("\n============================================")
	console.log("|     OneUnlimited API配置更新工具     |")
	console.log("============================================\n")

	// 读取现有配置
	let config = readConfig()

	console.log("当前API配置:")
	console.log(`- Claude API密钥: ${config.claudeApiKey ? "已配置 (已隐藏)" : "未配置"}`)
	console.log(`- Claude API URL: ${config.claudeBaseUrl || "https://api.anthropic.com/v1"}`)
	console.log(`- Claude 模型: ${config.claudeModel || "claude-3-7-sonnet-20240307"}`)
	console.log(`- DeepSeek API密钥: ${config.deepseekApiKey ? "已配置 (已隐藏)" : "未配置"}`)
	console.log(`- DeepSeek 模型: ${config.deepseekModel || "deepseek-chat"}`)
	console.log(`- 首选提供商: ${config.preferredProvider || "claude"}`)

	// 更新配置
	console.log("\n请输入新的API配置 (直接按回车保持当前值不变):")

	// 更新Claude API密钥
	config.claudeApiKey = await new Promise((resolve) => {
		rl.question(`Claude API密钥 [${config.claudeApiKey ? "已配置" : "未配置"}]: `, (answer) => {
			resolve(answer.trim() || config.claudeApiKey || "")
		})
	})

	// 更新Claude API URL
	config.claudeBaseUrl = await new Promise((resolve) => {
		const current = config.claudeBaseUrl || "https://api.anthropic.com/v1"
		rl.question(`Claude API URL [${current}]: `, (answer) => {
			resolve(answer.trim() || current)
		})
	})

	// 更新Claude模型
	config.claudeModel = await new Promise((resolve) => {
		const current = config.claudeModel || "claude-3-7-sonnet-20240307"
		rl.question(`Claude 模型 [${current}]: `, (answer) => {
			resolve(answer.trim() || current)
		})
	})

	// 更新DeepSeek API密钥
	config.deepseekApiKey = await new Promise((resolve) => {
		rl.question(`DeepSeek API密钥 [${config.deepseekApiKey ? "已配置" : "未配置"}]: `, (answer) => {
			resolve(answer.trim() || config.deepseekApiKey || "")
		})
	})

	// 更新DeepSeek模型
	config.deepseekModel = await new Promise((resolve) => {
		const current = config.deepseekModel || "deepseek-chat"
		rl.question(`DeepSeek 模型 [${current}]: `, (answer) => {
			resolve(answer.trim() || current)
		})
	})

	// 更新首选提供商
	config.preferredProvider = await new Promise((resolve) => {
		const current = config.preferredProvider || "claude"
		const options = "claude/deepseek"
		rl.question(`首选提供商 [${current}] (${options}): `, (answer) => {
			const value = answer.trim().toLowerCase()
			if (value === "claude" || value === "deepseek") {
				resolve(value)
			} else {
				resolve(current)
			}
		})
	})

	// 保存新配置
	saveConfig(config)

	console.log("\n配置已更新！")
	console.log("\n新的API配置:")
	console.log(`- Claude API密钥: ${config.claudeApiKey ? "已配置 (已隐藏)" : "未配置"}`)
	console.log(`- Claude API URL: ${config.claudeBaseUrl}`)
	console.log(`- Claude 模型: ${config.claudeModel}`)
	console.log(`- DeepSeek API密钥: ${config.deepseekApiKey ? "已配置 (已隐藏)" : "未配置"}`)
	console.log(`- DeepSeek 模型: ${config.deepseekModel}`)
	console.log(`- 首选提供商: ${config.preferredProvider}`)

	rl.close()
}

// 运行主函数
main().catch((error) => {
	console.error("更新配置出错:", error)
	rl.close()
})
