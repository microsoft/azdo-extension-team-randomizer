import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as SDK from 'azure-devops-extension-sdk';
import { CommonServiceIds, IProjectInfo, IProjectPageService, getClient } from 'azure-devops-extension-api';
import { IdentityServiceIds, IVssIdentityService } from 'azure-devops-extension-api/Identities';
import { CoreRestClient } from 'azure-devops-extension-api/Core';
import { GraphRestClient, GraphSubjectLookup, GraphSubjectLookupKey } from 'azure-devops-extension-api/Graph';

import { TeamMember } from 'azure-devops-extension-api/WebApi';

import { Header } from 'azure-devops-ui/Header';
import { Panel } from 'azure-devops-ui/Panel';
import { Persona, IIdentity, PersonaSize } from 'azure-devops-ui/Persona';
import { CustomDialog } from 'azure-devops-ui/Dialog';
import { ButtonGroup } from 'azure-devops-ui/ButtonGroup';
import { Button } from 'azure-devops-ui/Button';
import { IconSize } from 'azure-devops-ui/Icon';
import { logger } from '../logger';
import './panel.scss';
import { showRootComponent } from '../common';
import * as Constants from '../constants';
import { getService } from 'azure-devops-extension-sdk';

const log = logger.createChild('Panel');
const CoreAPIClient = getClient(CoreRestClient);
const GraphAPIClient = getClient(GraphRestClient);

interface IPanelState {
  config: any;
  projectContext: IProjectInfo | undefined;
  user: any;
  team: any;
  teamMembers: TeamMember[];
}

export class PanelContent extends React.Component<{}, IPanelState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      config: undefined,
      projectContext: undefined,
      user: undefined,
      team: undefined,
      teamMembers: []
    };
  }

  public componentDidMount() {
    log.debug('SDK initializing...');
    SDK.init();

    SDK.ready()
      .then(async () => {
        log.debug('SDK ready');

        const config = SDK.getConfiguration();
        const projectInfo = await this._getProjectInfo();
        let teamMembers = await CoreAPIClient.getTeamMembersWithExtendedProperties(config.project.id, config.team.id);
        teamMembers = teamMembers.filter((member) => !member.identity.isContainer);

        this.setState({
          config: config,
          projectContext: projectInfo,
          user: SDK.getUser(),
          team: SDK.getTeamContext(),
          teamMembers: teamMembers
        });

        SDK.notifyLoadSucceeded();
        SDK.resize();
      })
      .catch((error) => {
        log.error('SDK ready failed: ', error);
        SDK.notifyLoadFailed(error);
      });
  }

  public render(): JSX.Element {
    return (
      <div className='panel-container'>
        {/* Top Section - Action Buttons */}
        <div className='panel-section-top'>
          <ButtonGroup>
            <Button primary text='Next' iconProps={{ iconName: 'Next' }} onClick={this._onNext} />
            <Button text='Start Over' iconProps={{ iconName: 'Refresh' }} onClick={this._onStartOver} />
          </ButtonGroup>
        </div>

        {/* Middle Section - Content */}
        <div className='panel-section-middle'>
          <h2>Extension Context:</h2>
          <pre>{JSON.stringify(this.state.config, null, 2)}</pre>
          <h2>Project Context:</h2>
          <pre>{JSON.stringify(this.state.projectContext, null, 2)}</pre>
          <h2>User Info:</h2>
          <pre>{JSON.stringify(this.state.user, null, 2)}</pre>
          <Persona
            identity={
              {
                entityId: this.state.user?.id,
                displayName: this.state.user?.displayName,
                image: this.state.user?.imageUrl,
                mail: this.state.user?.name
              } as IIdentity
            }
            size={PersonaSize.size40}
          />
          <h2>Team Info:</h2>
          <pre>{JSON.stringify(this.state.team, null, 2)}</pre>
          <h2>Team Members:</h2>
          <pre>{JSON.stringify(this.state.teamMembers, null, 2)}</pre>

          <div>
            {this.state.teamMembers.map((member) => (
              <Persona
                key={member.identity.id}
                identity={
                  {
                    entityId: member.identity.id,
                    displayName: member.identity.displayName,
                    image: member.identity.imageUrl,
                    mail: member.identity.uniqueName
                  } as IIdentity
                }
                size={PersonaSize.size40}
              />
            ))}
          </div>
        </div>

        {/* Bottom Section - Settings Button */}
        <div className='panel-section-bottom'>
          <ButtonGroup>
            <Button subtle iconProps={{ iconName: 'Settings', size: IconSize.large }} onClick={this._onSettings} />
          </ButtonGroup>
        </div>
      </div>
    );
  }

  private async _getProjectInfo() {
    const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
    const project = await projectService.getProject();

    return project;
  }

  private _onNext = (): void => {
    log.debug('Next button clicked');
    // TODO: Implement next person logic
  };

  private _onStartOver = (): void => {
    log.debug('Start Over button clicked');
    // TODO: Implement start over logic
  };

  private _onSettings = (): void => {
    log.debug('Settings button clicked');
    // TODO: Implement settings logic
  };

  private _onClose = (): void => {
    log.debug('Close button clicked');
    // TODO: Close the panel
  };
}

// Render the component
showRootComponent(<PanelContent />);
