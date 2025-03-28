import * as vscode from "vscode"
import * as path from "path"

/**
 * A helper function which will get the webview URI of a given file or resource.
 *
 * @remarks This URI can be used within a webview's HTML as a link to the
 * given file/resource.
 *
 * @param webview A reference to the extension webview
 * @param extensionUri The URI of the directory containing the extension
 * @param pathList An array of strings representing the path to a file/resource
 * @returns A URI pointing to the file/resource
 */
export function getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]) {
	// 使用 path.join 组合路径，然后用 Uri.file 创建URI
	const pathOnDisk = path.join(extensionUri.fsPath, ...pathList)
	return webview.asWebviewUri(vscode.Uri.file(pathOnDisk))
}
