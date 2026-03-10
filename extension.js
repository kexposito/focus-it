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
  // Detect horizontal groups: multiple groups sharing the same viewColumn (stacked above/below)
  const viewColumnCounts = {};
  groups.forEach(g => {
    viewColumnCounts[g.viewColumn] = (viewColumnCounts[g.viewColumn] || 0) + 1;
  });
  const hasHorizontalGroups = Object.values(viewColumnCounts).some(count => count > 1);

  if (hasHorizontalGroups) {
    // Mixed or purely horizontal layout: handle above/below groups in same column
    const activeColumnGroups = groups.filter(g => g.viewColumn === activeGroup.groupViewColumn);
    const activeRowIndex = activeColumnGroups.findIndex(g => g.isActive);

    const aboveGroups = activeColumnGroups.slice(0, activeRowIndex).reverse();
    const belowGroups = activeColumnGroups.slice(activeRowIndex + 1);
    const leftGroups = groups.filter(g => g.viewColumn < activeGroup.groupViewColumn).reverse();
    const rightGroups = groups.filter(g => g.viewColumn > activeGroup.groupViewColumn);

    await openGroups(aboveGroups, "above");
    await openGroups(belowGroups, "below");
    await openGroups(leftGroups, "left");
    await openGroups(rightGroups, "right");
  } else {
    // Pure vertical layout (left/right groups only)
    const indexToSplit = activeGroup.groupViewColumn - 1;
    const leftGroups = groups.slice(0, indexToSplit).reverse();
    const rightGroups = groups.slice(indexToSplit + 1);

    await openGroups(leftGroups, "left");
    await openGroups(rightGroups, "right");
  }
}

async function openGroups(groups, side) {
  for (let gIndex = 0; gIndex < groups.length; gIndex++) {
    let group = groups[gIndex];

    // create a new group on the given side if is not the last one
    if (gIndex + 1 <= groups.length) {
      openNewGroup(side);
    }

    for (let index = 0; index < group.tabs.length; index++) {
      const tab = group.tabs[index];

      // reopen the tab inside the group
      await vscode.window.showTextDocument(tab.input.uri, { preview: false });
    }
  }

  await vscode.window.showTextDocument(activeGroup.uri, { preview: false, viewColumn: activeGroup.groupViewColumn });
}

function openNewGroup(side) {
  const commands = {
    right: 'workbench.action.newGroupRight',
    left: 'workbench.action.newGroupLeft',
    above: 'workbench.action.newGroupAbove',
    below: 'workbench.action.newGroupBelow'
  };
  vscode.commands.executeCommand(commands[side]);
}

function backupGroups() {
  return vscode.window.tabGroups.all.map((group, index) => ({
    isActive: group.isActive,
    tabs: backupGroupTabs(group),
    viewColumn: group.viewColumn,
    rowOrder: index
  })).sort((a, b) => {
    if (a.viewColumn !== b.viewColumn) return a.viewColumn - b.viewColumn;
    return a.rowOrder - b.rowOrder;
  });
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
    groupViewColumn: tab.group.viewColumn
  };
}

function buildStatusBar() {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = "In Focus";
  statusBarItem.command = "focus-it.execute";

  return statusBarItem;
}

exports.activate = activate;
