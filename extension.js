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

  if (!vscode.window.activeTextEditor) return;

  if (focusIsActive) {
    allGroupTabs = backupGroups();

    // close all tabGroups except the one in focus
    vscode.commands.executeCommand('workbench.action.closeEditorsInOtherGroups');
    statusBarItem.show()
  } else {
    restoreGroups(allGroupTabs);
    statusBarItem.hide()
  }
}

// restore the tabsGroup and set the focus in the right place
async function restoreGroups(groups) {
  const indexToSplit = activeGroup.gropuViewColumn - 1;
  const leftGroups = groups.slice(0, indexToSplit).reverse();
  const rightGroups = groups.slice(indexToSplit + 1);

  await openGroups(leftGroups, "left");
  await openGroups(rightGroups, "right");
}

async function openGroups(groups, side) {
  for (let gIndex = 0; gIndex < groups.length; gIndex++) {
    let group = groups[gIndex];

    // create a new group on the right if is not the last one
    if (gIndex + 1 <= groups.length) {
      openNewGroup(side);
    }

    for (let index = 0; index < group.tabs.length; index++) {
      const tab = group.tabs[index];

      // reopen the tab inside the group
      await vscode.window.showTextDocument(tab.input.uri, { preview: false });
    }
  }

  await vscode.window.showTextDocument(activeGroup.uri, { preview: false, viewColumn: activeGroup.gropuViewColumn });
}

function openNewGroup(side) {
  if (side === "right") {
    vscode.commands.executeCommand('workbench.action.newGroupRight');
  } else {
    vscode.commands.executeCommand('workbench.action.newGroupLeft');
  }
}

function backupGroups() {
  return vscode.window.tabGroups.all.map(group => ({
    isActive: group.isActive,
    tabs: backupGroupTabs(group),
    viewColumn: group.viewColumn
  })).sort((group1, group2) => (group1.viewColumn - group2.viewColumn))
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