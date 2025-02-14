// Color options for tab groups
const colors = [
  { name: 'grey', hex: '#888888' },
  { name: 'blue', hex: '#2196F3' },
  { name: 'red', hex: '#F44336' },
  { name: 'yellow', hex: '#FFC107' },
  { name: 'green', hex: '#4CAF50' },
  { name: 'pink', hex: '#E91E63' },
  { name: 'purple', hex: '#9C27B0' },
  { name: 'cyan', hex: '#00BCD4' }
];

let colorIndex = 0;
let allGroupsCollapsed = false;

// Update statistics
async function updateStats() {
  const tabs = await chrome.tabs.query({});
  const groups = await chrome.tabGroups.query({});
  document.getElementById('tabCount').textContent = `${tabs.length} Open Tabs`;
  document.getElementById('groupCount').textContent = `${groups.length} Tab Groups`;
}

// Organize tabs
document.getElementById('organizeBtn').addEventListener('click', async () => {
  try {
    // First, ungroup ALL tabs
    const allTabs = await chrome.tabs.query({});
    for (const tab of allTabs) {
      if (tab.groupId !== chrome.tabs.TAB_ID_NONE) {
        await chrome.tabs.ungroup(tab.id);
      }
    }

    // Reset color index
    colorIndex = 0;

    // Get fresh tabs after ungrouping
    const tabs = await chrome.tabs.query({});
    const groups = {};

    // Group tabs by domain
    tabs.forEach((tab) => {
      try {
        const url = new URL(tab.url);
        let groupTitle;

        if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:') {
          groupTitle = 'Chrome';
        } else {
          groupTitle = url.hostname.replace(/^www\./, '');
        }

        if (!groups[groupTitle]) {
          groups[groupTitle] = [];
        }
        groups[groupTitle].push(tab.id);
      } catch (e) {
        console.error("Invalid URL", tab.url);
      }
    });

    // Create new groups
    for (const [domain, tabIds] of Object.entries(groups)) {
      if (tabIds.length > 0) {
        try {
          const groupId = await chrome.tabs.group({ tabIds });
          await chrome.tabGroups.update(groupId, { 
            title: domain,
            color: colors[colorIndex % colors.length].name
          });
          colorIndex++;
        } catch (e) {
          console.error(`Failed to group tabs for domain ${domain}:`, e);
        }
      }
    }

    await updateStats();
  } catch (error) {
    console.error('Error in tab organization:', error);
  }
});

// Toggle all groups collapse state
document.getElementById('toggleGroupsBtn').addEventListener('click', async () => {
  const groups = await chrome.tabGroups.query({});
  allGroupsCollapsed = !allGroupsCollapsed;
  
  for (const group of groups) {
    await chrome.tabGroups.update(group.id, { 
      collapsed: allGroupsCollapsed 
    });
  }

  // Update button text and icon
  const btn = document.getElementById('toggleGroupsBtn');
  if (allGroupsCollapsed) {
    btn.innerHTML = '<i class="fas fa-expand-alt"></i><span>Expand All</span>';
  } else {
    btn.innerHTML = '<i class="fas fa-compress-alt"></i><span>Collapse All</span>';
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await updateStats();
});

// Auto-update stats when tabs or groups change
chrome.tabs.onCreated.addListener(updateStats);
chrome.tabs.onRemoved.addListener(updateStats);
chrome.tabGroups.onCreated.addListener(updateStats);
chrome.tabGroups.onRemoved.addListener(updateStats);
chrome.tabGroups.onUpdated.addListener(updateStats); 