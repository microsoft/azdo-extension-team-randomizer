import * as SDK from 'azure-devops-extension-sdk';
import * as API from 'azure-devops-extension-api';
import { logger } from '../shared/logger';
import { APP_TITLE, APP_DESCRIPTION } from '../shared/constants';

const log = logger.createChild('Button');

class Button {
  private async _getProjectInfo() {
    const projectService = await SDK.getService<API.IProjectPageService>(API.CommonServiceIds.ProjectPageService);
    const project = await projectService.getProject();

    return project;
  }

  public async execute(context: any) {
    const project = await this._getProjectInfo();
    const layoutService = await SDK.getService<API.IHostPageLayoutService>(API.CommonServiceIds.HostPageLayoutService);

    const panelId = `${SDK.getExtensionContext().id}.panel`;
    const panelOptions: API.IPanelOptions<{}> = {
      title: APP_TITLE,
      description: APP_DESCRIPTION,
      onClose: this._closeDialog,
      size: API.PanelSize.Medium,
      configuration: {
        project: {
          id: project?.id,
          name: project?.name
        },
        team: {
          id: context.team.id,
          name: context.team.name
        }
      }
    };

    log.debug('trying to OPEN panel', panelId);
    layoutService.openPanel(panelId, panelOptions);
    // layoutService.openCustomDialog(panelId, panelOptions);
  }

  private _closeDialog() {
    log.debug('trying to CLOSE panel');
  }
}

const buttonHandler = {
  execute: (context: any) => {
    const action = new Button();
    action.execute(context);
  }
};

SDK.init();
SDK.ready().then(() => {
  SDK.register('button', buttonHandler);
});
