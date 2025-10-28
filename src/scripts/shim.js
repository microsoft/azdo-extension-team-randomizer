IS_SETTINGS = false;

function isDevEnvironment() {
  let port = location.port;
  return port == '9393';
}

function setupDevShim() {
  console.log('DEV ENVIRONMENT!');
  let defaultDiv = document.getElementById('default');
  if (defaultDiv) defaultDiv.className = 'hidden';
  VSS = {
    init: function () {},
    register: function () {
      template = document.getElementById('localTest');
      this.appendDiv('<H1>Team Randomizer Test Page</H1>');
      this.appendDiv("<button id='dev'><img src='icon.png' /></button> ");
      this.appendDiv("<iframe src='' id='popUpFrame' class='hidden'></iframe>");
      let dev = document.getElementById('dev');
      dev.addEventListener('click', (event) => {
        extensionInfo = {
          publisherId: 'test-publisher',
          extensionId: '1234'
        };
        dialogService = {
          openDialog: function (page, options, properties) {
            console.log('open ' + page);
            let popUpFrame = document.getElementById('popUpFrame');
            popUpFrame.classList.remove('hidden');
            popUpFrame.src = 'popupDialog.html';
          }
        };
        properties = {};
        buttonHandler(dialogService, extensionInfo, properties);
      });
    },
    require: function () {
      _client = {
        getTeamMembersWithExtendedProperties: function () {
          return new Promise((resolve, reject) => {
            members = [];
            for (let i = 1; i <= 4; i++) {
              members.push({
                identity: {
                  id: i,
                  displayName: 'test person ' + i,
                  imageUrl: 'https://randomuser.me/api/portraits/lego/1.jpg'
                }
              });
            }
            resolve(members);
          });
        }
      };
      webContext = {
        project: {
          id: '1234'
        },
        team: {
          id: '54321'
        }
      };
      IS_SETTINGS ? loadSettingsData(_client, webContext) : loadData(_client, webContext);
    },
    notifyLoadSucceeded: function () {},
    getWebContext: function () {},
    appendDiv: function (content) {
      var myDiv = document.createElement('div');
      myDiv.innerHTML = content;
      myDiv.classList.add('devContent');
      document.body.appendChild(myDiv);
    }
  };
}
