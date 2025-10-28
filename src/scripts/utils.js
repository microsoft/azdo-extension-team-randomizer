function getTodaysKey() {
  const key = new Intl.DateTimeFormat().format(new Date()).replace(/\//g, '');
  return key;
}

function getDayStorage() {
  const key = getTodaysKey();
  const day = localStorage.getItem(key);
  return day;
}

function clearTodayStorage() {
  const key = getTodaysKey();
  localStorage.removeItem(key);
}

function storeToday(item) {
  const key = getTodaysKey();
  localStorage.setItem(key, item);
}

function storeShowQuestionStatus(status) {
  localStorage.setItem('showQuestion', status);
}

function getShowQuestionStatus() {
  return localStorage.getItem('showQuestion') == 'true';
}

function storeShowHotDStatus(status) {
  localStorage.setItem('showHotD', status);
}

function getShowHotDStatus() {
  return localStorage.getItem('showHotD') == 'true';
}

function storeSpeed(speed) {
  localStorage.setItem('speed', speed);
}

function getSpeed() {
  return localStorage.getItem('speed');
}
function getQuestions(callback) {
  fetch('https://raw.githubusercontent.com/microsoft/azdo-extension-team-randomizer/main/qotd.json')
    .then((response) => response.json())
    .then((questions) => {
      callback(questions);
    });
}

function getUnaskedQuestions(callback) {
  getQuestions((questions) => {
    const finishedQuestions = [];
    for (let iLoop = 0; iLoop < localStorage.length; iLoop++) {
      const current = localStorage.getItem(localStorage.key(iLoop)) || {};
      if (current.question) {
        finishedQuestions.push(current.question);
      }
    }
    if (finishedQuestions.length === questions.length) {
      finishedQuestions.clear();
    }
    callback(questions.filter((e) => !finishedQuestions.includes(e)));
  });
}

function getRandomQuestion(callback) {
  getUnaskedQuestions((questions) => {
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    callback(randomQuestion);
  });
}

function getRandomHotD(callback) {
  fetch('https://raw.githubusercontent.com/microsoft/azdo-extension-team-randomizer/main/hotd.json')
    .then((response) => response.json())
    .then((items) => {
      const formattedDate = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric'
      });
      const holidays = [];
      for (const entry of items) {
        if (entry.date === formattedDate) {
          holidays.push(entry.holidays);
        }
      }
      callback(holidays[Math.floor(Math.random() * holidays.length)]);
    });
}
function initStorage() {
  getRandomQuestion((question) => {
    getRandomHotD((hotd) => {
      const day = getDayStorage();
      if (!day) {
        storeToday(
          JSON.stringify({
            question: question,
            hotd: hotd,
            members: []
          })
        );
      }
    });
  });

  let speed = getSpeed();
  if (!speed) {
    speed = 200;
    storeSpeed(speed);
  }
}
