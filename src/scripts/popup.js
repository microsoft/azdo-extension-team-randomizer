function loadData(_client, _webContext) {
  const team = document.getElementById("team");
  const canvas = document.getElementById("canvas");
  const message = document.getElementById("message");
  const buttonNext = document.getElementById("buttonNext");
  const buttonStartOver = document.getElementById("buttonStartOver");
  const question = document.getElementById("question");
  const questionsPanel = document.getElementById("questionsPanel");
  const buttonRandomQuestion = document.getElementById("buttonRandomQuestion");
  const hotd = document.getElementById("hotd");
  const hotdPanel = document.getElementById("hotdPanel");
  const buttonRandomHotD = document.getElementById("buttonRandomHotD");

  const projectId = _webContext.project.id;
  const teamId = _webContext.team.id;
  const availableMembersKey = "availableMembers";
  const speed = getSpeed();

  const showQuestion = getShowQuestionStatus();
  if (!showQuestion) {
    questionsPanel.style.display = "none";
  }

  const showHotD = getShowHotDStatus();
  if (!showHotD) {
    hotdPanel.style.display = "none";
  }

  let first = false;
  let availableMembers = localStorage.getItem(availableMembersKey);
  if (!availableMembers) {
    first = true;
  }
  availableMembers = availableMembers ? JSON.parse(availableMembers) : [];
  let counter = 0;

  _client.getTeamMembersWithExtendedProperties(projectId, teamId, 100, 0).then((members) => {
    const createRowForTeamMember = (member) => {
      const row = document.createElement("tr");
      row.id = `member-${member.identity.id}`;

      const id = document.createElement("td");
      const photo = document.createElement("td");
      const name = document.createElement("td");

      id.innerText = ++counter;
      id.style.width = "10%";
      photo.innerHTML = "<img src='" + member.identity.imageUrl + "' width='44' height='44' />";
      photo.style.width = "50px";
      name.innerHTML = "<span>" + member.identity.displayName + "</span>";

      row.appendChild(id);
      row.appendChild(photo);
      row.appendChild(name);

      return row;
    }

    const key = (new Intl.DateTimeFormat().format(new Date())).replace(/\//g, "");
    const storage = JSON.parse(localStorage.getItem(key));
    console.log({key, storage});

    const questionOfTheDay = storage?.question;
    let completedTeamMembers = storage?.members;

    question.innerText = questionOfTheDay?.text ?? "";

    let notCompletedTeamMembers = members.filter((member) => {
      return !completedTeamMembers.some((teamMember) => {
        return teamMember === member.identity.id;
      });
    });

    members.forEach((member) => {
      const memberId = member.identity.id.toString();
      if (first || availableMembers.indexOf(memberId) > -1) {
        team.appendChild(createRowForTeamMember(member));
      }
    });

    completedTeamMembers.forEach((member) => {
      const row = document.getElementById(`member-${member}`);
      if (row)
        row.classList.add("completed");
    });

    const startRandomizer = () => {
      let randomizer = 0;
      const randomNumber = () => {
        const randomIndex = Math.floor(Math.random() * notCompletedTeamMembers.length);
        const randomMember = notCompletedTeamMembers[randomIndex];

        team.querySelectorAll("tr").forEach((row) => {
          row.classList.remove("bold");
        });

        const memberElement = document.getElementById(`member-${randomMember.identity.id}`);
        if (memberElement) {
          memberElement.classList.add("bold");

          if (randomizer++ > 20) {
            clearInterval(timer);

            memberElement.style.color = "green";

            completedTeamMembers.push(randomMember.identity.id);
            notCompletedTeamMembers.splice(randomIndex, 1);

            localStorage.setItem(key, JSON.stringify({ question: questionOfTheDay, members: completedTeamMembers }));

            buttonNext.disabled = false;
          }
        }
      }

      let timer = 0;

      if (notCompletedTeamMembers.length > 0) {
        if (notCompletedTeamMembers.length === 1) {
          const randomMember = notCompletedTeamMembers[0];

          team.querySelectorAll("tr").forEach((row) => {
            row.classList.remove("bold");
          });

          const memberElement = document.getElementById(`member-${randomMember.identity.id}`);
          memberElement.classList.add("bold");
          memberElement.style.color = "green";

          completedTeamMembers.push(randomMember.identity.id);

          storeToday(JSON.stringify({ question: questionOfTheDay, members: completedTeamMembers }));
        } else {
          timer = setInterval(randomNumber, speed);
        }
      }
    };

    buttonStartOver.addEventListener("click", () => {
      clearTodayStorage();
      initStorage();

      completedTeamMembers = [];
      notCompletedTeamMembers = members.slice();

      Array.from(team.children).forEach(tr => {
        tr.className = "";
        tr.style = "";
      });

      buttonNext.disabled = false;
    });

    buttonNext.addEventListener("click", () => {
      canvas.style.display = "none";
      message.style.display = "none";

      buttonNext.disabled = true;

      Array.from(team.children).forEach(tr => {
        if (tr.style.color === "green") {
          tr.className = "";
          tr.style = "";
          tr.classList.add("completed");
        }
      });

      startRandomizer();
    });

    buttonRandomQuestion.addEventListener("click", () => {
      getRandomQuestion((questionOfTheDay) => {
        const day = getDayStorage();
        if (day) {
          storeToday(JSON.stringify({
            question: questionOfTheDay,
            members: day.members,
          }));
          question.innerText = questionOfTheDay.text;
        }
      });
    });

    buttonNext.click();
  });
}
