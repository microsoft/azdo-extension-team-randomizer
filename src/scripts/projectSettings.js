async function loadSettingsPage(_client, _identityClient, _webContext, SDK) {
  const projectId = _webContext.project.id;
  const teamSelect = document.getElementById('teamSelect');
  const loading = document.getElementById('loading');
  const membersContainer = document.getElementById('membersContainer');
  const membersList = document.getElementById('membersList');
  const saveButton = document.getElementById('saveButton');
  const selectAllButton = document.getElementById('selectAllButton');
  const deselectAllButton = document.getElementById('deselectAllButton');
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');

  let currentTeamMembers = [];
  let customMembers = {};
  let allSettings = {};
  let allProjectMembers = [];

  async function loadTeams() {
    try {
      const teams = await _client.getTeams(projectId, 100, 0);
      teamSelect.innerHTML = '<option value="">Select a team...</option>';
      teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        teamSelect.appendChild(option);
      });
      loading.style.display = 'none';
    } catch (error) {
      console.error('Failed to load teams:', error);
      loading.textContent = 'Failed to load teams.';
    }
  }

  async function getAllPeopleRecursively(projectId, teamId, visited = new Set()) {
    if (visited.has(teamId)) {
      return [];
    }
    visited.add(teamId);

    try {
      const members = await _client.getTeamMembersWithExtendedProperties(projectId, teamId, 100, 0);
      const people = [];
      const subTeamPromises = [];

      for (const member of members) {
        if (member.identity.isContainer) {
          subTeamPromises.push(getAllPeopleRecursively(projectId, member.identity.id, visited).catch(() => []));
        } else {
          people.push(member);
        }
      }

      const subTeamPeople = await Promise.all(subTeamPromises);
      return people.concat(...subTeamPeople);
    } catch (error) {
      console.error(`Failed to load members for team ${teamId}:`, error);
      return [];
    }
  }

  async function loadAllProjectMembers() {
    if (allProjectMembers.length > 0) {
      return allProjectMembers;
    }

    try {
      const teams = await _client.getTeams(projectId, 100, 0);
      const allPeopleMap = new Map();

      for (const team of teams) {
        try {
          const members = await _client.getTeamMembersWithExtendedProperties(projectId, team.id, 100, 0);
          members.forEach(member => {
            if (!member.identity.isContainer) {
              allPeopleMap.set(member.identity.id, member);
            }
          });
        } catch (error) {
          console.error(`Failed to load members for team ${team.name}:`, error);
        }
      }

      allProjectMembers = Array.from(allPeopleMap.values());
      return allProjectMembers;
    } catch (error) {
      console.error('Failed to load all project members:', error);
      return [];
    }
  }

  async function searchMembers(searchTerm) {
    try {
      const allMembers = await loadAllProjectMembers();

      return allMembers.filter(m =>
        m.identity.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.identity.uniqueName && m.identity.uniqueName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    } catch (error) {
      console.error('Failed to search members:', error);
      return [];
    }
  }

  async function loadSettings() {
    try {
      const data = await getAvailableMembers(SDK);
      return data || {};
    } catch (error) {
      console.log('No existing settings found, starting fresh');
      return {};
    }
  }

  async function saveSettings(settings) {
    try {
      return await saveAvailableMembers(SDK, settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  function renderMembers(members, availableMembers) {
    membersList.innerHTML = '';

    if (members.length === 0) {
      membersList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No members found in this team.</div>';
      return;
    }

    members.forEach(member => {
      const memberId = member.identity.id;
      const isAvailable = availableMembers.includes(memberId);

      const div = document.createElement('div');
      div.className = 'member-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'member-checkbox';
      checkbox.checked = isAvailable;
      checkbox.dataset.memberId = memberId;

      const img = document.createElement('img');
      img.src = member.identity.imageUrl;
      img.className = 'member-avatar';
      img.alt = member.identity.displayName;

      const name = document.createElement('span');
      name.className = 'member-name';
      name.textContent = member.identity.displayName;

      div.appendChild(checkbox);
      div.appendChild(img);
      div.appendChild(name);
      membersList.appendChild(div);
    });
  }

  teamSelect.addEventListener('change', async () => {
    const selectedTeamId = teamSelect.value;

    if (!selectedTeamId) {
      membersContainer.style.display = 'none';
      return;
    }

    loading.style.display = 'block';
    loading.textContent = 'Loading team members...';
    membersContainer.style.display = 'none';
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    const allPeople = await getAllPeopleRecursively(projectId, selectedTeamId);

    const uniquePeopleMap = new Map();
    allPeople.forEach(member => {
      uniquePeopleMap.set(member.identity.id, member);
    });
    currentTeamMembers = Array.from(uniquePeopleMap.values());

    const teamCustomMembers = customMembers[selectedTeamId] || [];
    const allMembers = [...currentTeamMembers, ...teamCustomMembers];

    const availableMembers = allSettings[selectedTeamId] || allMembers.map(m => m.identity.id);

    renderMembers(allMembers, availableMembers);

    loading.style.display = 'none';
    membersContainer.style.display = 'block';
  });

  saveButton.addEventListener('click', async () => {
    const selectedTeamId = teamSelect.value;
    if (!selectedTeamId) return;

    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    const checkboxes = membersList.querySelectorAll('.member-checkbox');
    const availableMembers = [];
    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        availableMembers.push(checkbox.dataset.memberId);
      }
    });

    allSettings[selectedTeamId] = availableMembers;
    allSettings._customMembers = customMembers;

    const success = await saveSettings(allSettings);

    saveButton.disabled = false;
    saveButton.textContent = 'Save';

    if (success) {
      successMessage.style.display = 'block';
      setTimeout(() => {
        successMessage.style.display = 'none';
      }, 3000);
    } else {
      errorMessage.style.display = 'block';
      setTimeout(() => {
        errorMessage.style.display = 'none';
      }, 5000);
    }
  });

  selectAllButton.addEventListener('click', () => {
    const checkboxes = membersList.querySelectorAll('.member-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
    });
  });

  deselectAllButton.addEventListener('click', () => {
    const checkboxes = membersList.querySelectorAll('.member-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
  });

  const addMemberButton = document.getElementById('addMemberButton');
  const memberSearch = document.getElementById('memberSearch');

  addMemberButton.addEventListener('click', () => {
    const memberName = memberSearch.value.trim();
    if (!memberName || !teamSelect.value) return;

    const selectedTeamId = teamSelect.value;

    if (!customMembers[selectedTeamId]) {
      customMembers[selectedTeamId] = [];
    }

    const customMember = {
      identity: {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
        displayName: memberName,
        imageUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDQiIGhlaWdodD0iNDQiIHZpZXdCb3g9IjAgMCA0NCA0NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMiIgY3k9IjIyIiByPSIyMiIgZmlsbD0iIzYwNkM4OCIvPjxwYXRoIGQ9Ik0yMiAxNkMyNC4yMSAxNiAyNiAxNy43OSAyNiAyMEMyNiAyMi4yMSAyNC4yMSAyNCAyMiAyNEMxOS43OSAyNCAxOCAyMi4yMSAxOCAyMEMxOCAxNy43OSAxOS43OSAxNiAyMiAxNlpNMjIgMjZDMjUuMzMgMjYgMzIgMjcuNjcgMzIgMzFWMzJIMTJWMzFDMTIgMjcuNjcgMTguNjcgMjYgMjIgMjZaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==', // Simple avatar placeholder SVG
        isContainer: false
      }
    };

    const exists = currentTeamMembers.some(m => m.identity.displayName.toLowerCase() === memberName.toLowerCase()) ||
                   customMembers[selectedTeamId].some(m => m.identity.displayName.toLowerCase() === memberName.toLowerCase());

    if (exists) {
      alert('A member with this name already exists in the list');
      return;
    }

    customMembers[selectedTeamId].push(customMember);

    const allMembers = [...currentTeamMembers, ...customMembers[selectedTeamId]];
    const availableMembers = allSettings[selectedTeamId] || allMembers.map(m => m.identity.id);
    renderMembers(allMembers, availableMembers);

    memberSearch.value = '';
  });

  memberSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addMemberButton.click();
    }
  });

  allSettings = await loadSettings();
  customMembers = allSettings._customMembers || {};
  await loadTeams();
}
