import * as API from 'azure-devops-extension-api';
import { logger } from '../shared/logger';
import { initExtension, getSdk } from '../shared/sdk';
import { APP_TITLE, APP_DESCRIPTION } from '../shared/constants';

const log = logger.createChild('Button');

interface ButtonContext {
  team: {
    id: string;
    name?: string;
  };
}

class Button {
  private async _getProjectInfo() {
    const sdk = getSdk();
    const projectService = await sdk.getService<API.IProjectPageService>(API.CommonServiceIds.ProjectPageService);
    const project = await projectService.getProject();

    return project;
  }

  public async execute(context: ButtonContext) {
    const project = await this._getProjectInfo();
    const sdk = getSdk();
    const layoutService = await sdk.getService<API.IHostPageLayoutService>(API.CommonServiceIds.HostPageLayoutService);

    const panelId = `${getSdk().getExtensionContext().id}.panel`;
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
  execute: (context: ButtonContext) => {
    const action = new Button();
    action.execute(context);
  }
};

void initExtension(false).then(() => {
  getSdk().register('button', buttonHandler);
});
