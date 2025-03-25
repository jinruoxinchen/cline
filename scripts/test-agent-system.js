#!/usr/bin/env node

/**
 * OneUnlimited 多代理系统测试脚本
 *
 * 此脚本用于启动VSCode并加载OneUnlimited扩展，以便测试多代理系统功能
 */

const { spawn } = require("child_process")
const path = require("path")
const fs = require("fs")
const os = require("os")

// 项目根目录
const rootDir = path.resolve(__dirname, "..")

// 确保目录存在
if (!fs.existsSync(rootDir)) {
	console.error(`找不到项目根目录: ${rootDir}`)
	process.exit(1)
}

// 尝试查找VSCode可执行文件
function findVSCodeExecutable() {
	const platform = os.platform()

	// 根据平台查找可能的VSCode可执行文件位置
	if (platform === "darwin") {
		// macOS - 首先尝试使用直接的命令行工具
		try {
			// 检查环境变量PATH中是否有code命令
			const { execSync } = require("child_process")
			execSync("which code", { stdio: "ignore" })
			console.log("找到VSCode命令行工具: code")
			return "code" // 如果没有抛出错误，说明code命令存在
		} catch (e) {
			console.log('未找到命令行工具"code"，将尝试直接路径...')

			// 如果code命令不存在，尝试特定路径
			const possiblePaths = ["/usr/local/bin/code", "/usr/bin/code", "/opt/visual-studio-code/bin/code"]

			for (const p of possiblePaths) {
				if (fs.existsSync(p)) {
					console.log(`找到VSCode路径: ${p}`)
					return p
				}
			}

			console.log('未找到VSCode安装路径，将使用默认"code"命令')
			return "code"
		}
	} else if (platform === "win32") {
		// Windows
		const paths = [
			"C:\\Program Files\\Microsoft VS Code\\bin\\code.cmd",
			"C:\\Program Files\\Microsoft VS Code Insiders\\bin\\code.cmd",
			`${os.homedir()}\\AppData\\Local\\Programs\\Microsoft VS Code\\bin\\code.cmd`,
			`${os.homedir()}\\AppData\\Local\\Programs\\Microsoft VS Code Insiders\\bin\\code.cmd`,
		]

		for (const p of paths) {
			if (fs.existsSync(p)) {
				return p
			}
		}

		// 如果找不到具体路径，尝试使用命令行中的code
		return "code"
	} else {
		// Linux 和其他平台
		return "code"
	}
}

// 启动VSCode并加载OneUnlimited扩展
async function launchVSCode() {
	const vscodeExecutable = findVSCodeExecutable()

	console.log("==================================================")
	console.log("  OneUnlimited 多代理系统测试启动器")
	console.log("==================================================")
	console.log()
	console.log(`启动 VSCode...`)

	// 准备VSCode启动参数 - 使用更简单的参数组合
	const args = [
		rootDir, // 打开项目根目录
		"--new-window", // 打开新窗口
	]

	console.log(`使用VSCode可执行文件: ${vscodeExecutable}`)
	console.log(`启动参数: ${args.join(" ")}`)

	// 启动VSCode进程
	const vscodeProcess = spawn(vscodeExecutable, args, {
		stdio: "inherit",
		shell: true,
	})

	// 处理进程事件
	vscodeProcess.on("error", (error) => {
		console.error("启动VSCode时出错:", error.message)
		process.exit(1)
	})

	vscodeProcess.on("close", (code) => {
		console.log(`VSCode已退出，代码: ${code}`)
		process.exit(code)
	})

	// 使用Ctrl+C关闭程序
	process.on("SIGINT", () => {
		console.log("接收到中断信号，正在关闭...")
		vscodeProcess.kill()
	})

	console.log()
	console.log("如果VSCode成功启动，请按照以下步骤测试多代理系统:")
	console.log()
	console.log("1. 等待VSCode完全加载")
	console.log("2. 打开命令面板 (Ctrl+Shift+P 或 Cmd+Shift+P)")
	console.log('3. 输入并选择 "OneUnlimited: 运行多代理系统演示"')
	console.log()
	console.log("或者:")
	console.log()
	console.log("1. 点击状态栏中的多代理系统图标")
	console.log("2. 在代理系统界面中输入任务并提交")
	console.log()
	console.log("按 Ctrl+C 退出此脚本")
}

// 执行主函数
launchVSCode().catch((error) => {
	console.error("执行过程中出错:", error.message)
	process.exit(1)
})
