import * as SDK from 'azure-devops-extension-sdk';
import {
  CommonServiceIds,
  IHostPageLayoutService,
  IPanelOptions,
  PanelSize,
  IProjectPageService
} from 'azure-devops-extension-api';
import * as Constants from '../constants';
import { logger } from '../logger';

const log = logger.createChild('ActionButton');

export class ActionButton {
  private async _getProjectInfo() {
    const projectService = await SDK.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
    const project = await projectService.getProject();

    return project;
  }

  public async execute(context: any) {
    const project = await this._getProjectInfo();
    const layoutService = await SDK.getService<IHostPageLayoutService>(CommonServiceIds.HostPageLayoutService);

    const panelId = `${SDK.getExtensionContext().id}.panel`;
    const panelOptions: IPanelOptions<{}> = {
      title: Constants.ActionButtonTitle,
      description: Constants.ActionButtonDescription,
      onClose: this._closeDialog,
      size: PanelSize.Medium,
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

const actionButtonHandler = {
  execute: (actionContext: any) => {
    const action = new ActionButton();
    action.execute(actionContext);
  }
};

SDK.register('action-button', actionButtonHandler);
SDK.init();
