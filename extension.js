const vscode = require('vscode');

function activate(context) {
	let disposable = vscode.commands.registerCommand('focus-it.execute', function () {
		vscode.commands.executeCommand('workbench.action.closeEditorsInOtherGroups');
	});

	context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate
}
