function loadData(_client, _webContext, SDK) {
  const teamElement = document.getElementById('team');
  const canvas = document.getElementById('canvas');
  const message = document.getElementById('message');
  const question = document.getElementById('question');
  const hotd = document.getElementById('hotd');
  const buttonRandomQuestion = document.getElementById('buttonRandomQuestion');
  const buttonRandomHotD = document.getElementById('buttonRandomHotD');
  const teamSelector = document.getElementById('teamSelector');
  const teamMembersContainer = document.getElementById('teamMembersContainer');
  const loadingIndicator = document.getElementById('loadingIndicator');

  const projectId = _webContext.project.id;
  let currentTeamId = null;

  let counter = 0;
  let handleNext, handleStartOver;
  let completedTeamMembers = [];
  let notCompletedTeamMembers = [];
  let peopleOnly = [];
  let questionOfTheDay = null;
  let holidayOfTheDay = null;

  async function getRandomizerData() {
    try {
      const allSettings = await getAvailableMembers(SDK);
      return allSettings._randomizerData || {};
    } catch (error) {
      console.log('Failed to load randomizer data:', error);
      return {};
    }
  }

  async function saveRandomizerData(data) {
    try {
      const allSettings = await getAvailableMembers(SDK);
      allSettings._randomizerData = data;
      await saveAvailableMembers(SDK, allSettings);
    } catch (error) {
      console.error('Failed to save randomizer data:', error);
    }
  }

  async function initializeContent() {
    const key = getTodaysKey();
    const randomizerData = await getRandomizerData();
    const storage = randomizerData[key];

    if (storage) {
      questionOfTheDay = storage.question;
      holidayOfTheDay = storage.hotd;
      question.innerText = questionOfTheDay?.text ?? '';
      hotd.innerText = holidayOfTheDay ?? '';
    } else {
      await new Promise((resolve) => {
        getRandomQuestion((q) => {
          questionOfTheDay = q;
          question.innerText = questionOfTheDay?.text ?? '';
          getRandomHotD((h) => {
            holidayOfTheDay = h;
            hotd.innerText = holidayOfTheDay ?? '';

            const data = randomizerData;
            data[key] = {
              question: questionOfTheDay,
              hotd: holidayOfTheDay,
              teamMembers: {}
            };
            saveRandomizerData(data);
            resolve();
          });
        });
      });
    }
  }

  async function loadTeams() {
    try {
      const teams = await _client.getTeams(projectId, 100, 0);

      teams.forEach((team) => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.name;
        teamSelector.appendChild(option);
      });
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  }

  async function loadAvailableMembers(teamId) {
    try {
      const allSettings = await getAvailableMembers(SDK);
      if (allSettings && allSettings[teamId]) {
        return allSettings[teamId];
      }
    } catch (error) {
      console.log('Failed to load settings:', error);
    }
    return [];
  }

  async function getAllPeopleRecursively(projectId, teamId, visited = new Set()) {
    if (visited.has(teamId)) {
      return [];
    }
    visited.add(teamId);

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
  }

  async function loadTeamMembers(teamId) {
    loadingIndicator.style.display = 'block';
    teamMembersContainer.style.display = 'none';
    teamElement.innerHTML = '';
    counter = 0;

    try {
      const availableMembers = await loadAvailableMembers(teamId);
      const allSettings = await getAvailableMembers(SDK);
      const customMembers = allSettings._customMembers?.[teamId] || [];

      const allPeople = await getAllPeopleRecursively(projectId, teamId);

      const uniquePeopleMap = new Map();
      allPeople.forEach((member) => {
        uniquePeopleMap.set(member.identity.id, member);
      });

      customMembers.forEach((member) => {
        uniquePeopleMap.set(member.identity.id, member);
      });

      peopleOnly = Array.from(uniquePeopleMap.values());

      const first = availableMembers.length === 0;
      const displayMembers = peopleOnly.filter((member) => {
        const memberId = member.identity.id.toString();
        return first || availableMembers.indexOf(memberId) > -1;
      });

      const key = getTodaysKey();
      const randomizerData = await getRandomizerData();
      const teamCompletedMembers = randomizerData[key]?.teamMembers?.[teamId] || [];

      displayMembers.forEach((member) => {
        const row = createRowForTeamMember(member);
        teamElement.appendChild(row);

        if (teamCompletedMembers.includes(member.identity.id)) {
          row.classList.add('completed');
        }
      });

      notCompletedTeamMembers = displayMembers.filter((member) => {
        return !teamCompletedMembers.includes(member.identity.id);
      });

      loadingIndicator.style.display = 'none';
      teamMembersContainer.style.display = 'block';

    } catch (error) {
      console.error('Failed to load team members:', error);
      loadingIndicator.style.display = 'none';
    }
  }

  function createRowForTeamMember(member) {
    const row = document.createElement('tr');
    row.id = `member-${member.identity.id}`;

    const id = document.createElement('td');
    const photo = document.createElement('td');
    const name = document.createElement('td');

    id.textContent = ++counter;

    const img = document.createElement('img');
    img.src = member.identity.imageUrl;
    img.width = 44;
    img.height = 44;
    img.alt = member.identity.displayName;
    photo.appendChild(img);

    name.textContent = member.identity.displayName;

    row.appendChild(id);
    row.appendChild(photo);
    row.appendChild(name);

    return row;
  }

  function startRandomizer() {
    let randomizer = 0;
    let timer = 0;

    if (notCompletedTeamMembers.length === 0) {
      return;
    }

    if (notCompletedTeamMembers.length === 1) {
      const randomMember = notCompletedTeamMembers[0];
      highlightMember(randomMember, true);
      saveCompletedMember(randomMember.identity.id);
      return;
    }

    const randomNumber = () => {
      const randomIndex = Math.floor(Math.random() * notCompletedTeamMembers.length);
      const randomMember = notCompletedTeamMembers[randomIndex];

      teamElement.querySelectorAll('tr').forEach((row) => {
        row.classList.remove('bold');
      });

      const memberElement = document.getElementById(`member-${randomMember.identity.id}`);
      if (memberElement) {
        memberElement.classList.add('bold');

        if (randomizer++ > 20) {
          clearInterval(timer);
          highlightMember(randomMember, true);
          saveCompletedMember(randomMember.identity.id);
          notCompletedTeamMembers.splice(randomIndex, 1);
        }
      }
    };

    timer = setInterval(randomNumber, 200);
  }

  function highlightMember(member, permanent) {
    const memberElement = document.getElementById(`member-${member.identity.id}`);
    if (memberElement) {
      memberElement.classList.add('bold');
      if (permanent) {
        memberElement.style.color = 'green';
      }
    }
  }

  async function saveCompletedMember(memberId) {
    const key = getTodaysKey();
    const randomizerData = await getRandomizerData();

    if (!randomizerData[key]) {
      randomizerData[key] = {
        question: questionOfTheDay,
        hotd: holidayOfTheDay,
        teamMembers: {}
      };
    }

    if (!randomizerData[key].teamMembers) {
      randomizerData[key].teamMembers = {};
    }
    if (!randomizerData[key].teamMembers[currentTeamId]) {
      randomizerData[key].teamMembers[currentTeamId] = [];
    }

    randomizerData[key].teamMembers[currentTeamId].push(memberId);
    await saveRandomizerData(randomizerData);
  }

  handleNext = function() {
    canvas.style.display = 'none';
    message.style.display = 'none';

    Array.from(teamElement.children).forEach((tr) => {
      if (tr.style.color === 'green') {
        tr.className = '';
        tr.style = '';
        tr.classList.add('completed');
      }
    });

    if (notCompletedTeamMembers.length > 0) {
      startRandomizer();
    }
  };

  handleStartOver = async function() {
    const key = getTodaysKey();
    const randomizerData = await getRandomizerData();

    if (!randomizerData[key]) {
      randomizerData[key] = {
        question: questionOfTheDay,
        hotd: holidayOfTheDay,
        teamMembers: {}
      };
    }

    if (randomizerData[key].teamMembers) {
      randomizerData[key].teamMembers[currentTeamId] = [];
    }

    await saveRandomizerData(randomizerData);

    Array.from(teamElement.children).forEach((tr) => {
      tr.className = '';
      tr.style = '';
    });

    notCompletedTeamMembers = peopleOnly.slice();

    if (notCompletedTeamMembers.length > 0) {
      startRandomizer();
    }
  };

  SDK.register('popupDialog', {
    onNext: handleNext,
    onStartOver: handleStartOver
  });

  buttonRandomQuestion.addEventListener('click', async () => {
    getRandomQuestion(async (q) => {
      questionOfTheDay = q;
      const key = getTodaysKey();
      const randomizerData = await getRandomizerData();

      if (!randomizerData[key]) {
        randomizerData[key] = { teamMembers: {} };
      }
      randomizerData[key].question = questionOfTheDay;

      await saveRandomizerData(randomizerData);
      question.innerText = questionOfTheDay.text;
    });
  });

  buttonRandomHotD.addEventListener('click', async () => {
    getRandomHotD(async (h) => {
      holidayOfTheDay = h;
      const key = getTodaysKey();
      const randomizerData = await getRandomizerData();

      if (!randomizerData[key]) {
        randomizerData[key] = { teamMembers: {} };
      }
      randomizerData[key].hotd = holidayOfTheDay;

      await saveRandomizerData(randomizerData);
      hotd.innerText = holidayOfTheDay;
    });
  });

  teamSelector.addEventListener('change', async (e) => {
    currentTeamId = e.target.value;
    if (currentTeamId) {
      await loadTeamMembers(currentTeamId);
    } else {
      teamMembersContainer.style.display = 'none';
      teamElement.innerHTML = '';
    }
  });

  initializeContent().then(() => {
    loadTeams();
  });
}
