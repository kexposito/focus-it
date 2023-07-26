const vscode = require('vscode');

let focusIsActive = false;
let allGroupTabs = [];
let activeGroup;
const statusBarItem = buildStatusBar();

function activate(context) {
  const disposable = vscode.commands.registerCommand('focus-it.execute', getTextEditorsForEditorGroups);

  context.subscriptions.push(disposable, statusBarItem);
}

function getTextEditorsForEditorGroups() {
  focusIsActive = !focusIsActive;

  if (focusIsActive) {
    allGroupTabs = backupGroups();

    // close all tabGroups except the one in focus
    vscode.commands.executeCommand('workbench.action.closeEditorsInOtherGroups');
    statusBarItem.show()
  } else {
    // close all the tabsGroups
    vscode.commands.executeCommand('workbench.action.closeAllGroups');

    restoreGroups(allGroupTabs);
    statusBarItem.hide()
  }
}

// restore the tabsGroup and set the focus in the right place
async function restoreGroups(groups) {
  for (let gIndex = 0; gIndex < groups.length; gIndex++) {
    let group = groups[gIndex];

    for (let index = 0; index < group.tabs.length; index++) {
      const tab = group.tabs[index];

      // reopen the tab inside the group
      await vscode.window.showTextDocument(tab.input.uri, { preview: false });
    }

    // create a new group on the right if is not the last one
    if (gIndex + 1 < groups.length) {
      vscode.commands.executeCommand('workbench.action.newGroupRight');
    }
  }

  // set the group and tab in focus after recovery the previous state
  await vscode.window.showTextDocument(activeGroup.uri, { preview: false, viewColumn: activeGroup.gropuViewColumn });
}

function backupGroups() {
  return vscode.window.tabGroups.all.map(group => ({
    isActive: group.isActive,
    tabs: backupGroupTabs(group)
  }))
}

function backupGroupTabs(group) {
  return group.tabs.map((tab) => {
    if (tab.group.isActive && tab.isActive) {
      setActiveGroupAndTab(tab)
    }

    return {
      isActive: tab.isActive,
      input: tab.input
    }
  })
}

function setActiveGroupAndTab(tab) {
  activeGroup = {
    uri: tab.input.uri,
    gropuViewColumn: tab.group.viewColumn
  };
}

function buildStatusBar() {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = "In Focus";
  statusBarItem.command = "focus-it.execute";

  return statusBarItem;
}

exports.activate = activate;