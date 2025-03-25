# OneUnlimited API

The OneUnlimited extension exposes an API that can be used by other extensions. To use this API in your extension:

1. Copy `src/extension-api/oneunlimited.d.ts` to your extension's source directory.
2. Include `oneunlimited.d.ts` in your extension's compilation.
3. Get access to the API with the following code:

    ```ts
    const oneunlimitedExtension = vscode.extensions.getExtension<OneUnlimitedAPI>("saoudrizwan.claude-dev")

    if (!oneunlimitedExtension?.isActive) {
    	throw new Error("OneUnlimited extension is not activated")
    }

    const oneunlimited = oneunlimitedExtension.exports

    if (oneunlimited) {
    	// Now you can use the API

    	// Set custom instructions
    	await oneunlimited.setCustomInstructions("Talk like a pirate")

    	// Get custom instructions
    	const instructions = await oneunlimited.getCustomInstructions()
    	console.log("Current custom instructions:", instructions)

    	// Start a new task with an initial message
    	await oneunlimited.startNewTask("Hello, OneUnlimited! Let's make a new project...")

    	// Start a new task with an initial message and images
    	await oneunlimited.startNewTask("Use this design language", ["data:image/webp;base64,..."])

    	// Send a message to the current task
    	await oneunlimited.sendMessage("Can you fix the @problems?")

    	// Simulate pressing the primary button in the chat interface (e.g. 'Save' or 'Proceed While Running')
    	await oneunlimited.pressPrimaryButton()

    	// Simulate pressing the secondary button in the chat interface (e.g. 'Reject')
    	await oneunlimited.pressSecondaryButton()
    } else {
    	console.error("OneUnlimited API is not available")
    }
    ```

    **Note:** To ensure that the `saoudrizwan.claude-dev` extension is activated before your extension, add it to the `extensionDependencies` in your `package.json`:

    ```json
    "extensionDependencies": [
        "saoudrizwan.claude-dev"
    ]
    ```

For detailed information on the available methods and their usage, refer to the `oneunlimited.d.ts` file.
