import * as SDK from 'azure-devops-extension-sdk';
import * as API from 'azure-devops-extension-api';

let extensionDataManager: API.IExtensionDataManager | undefined;

async function getExtensionDataManager(): Promise<API.IExtensionDataManager> {
  if (!extensionDataManager) {
    const accessToken = await SDK.getAccessToken();
    const extensionContext = SDK.getExtensionContext();
    const dataService = await SDK.getService<API.IExtensionDataService>(API.CommonServiceIds.ExtensionDataService);
    extensionDataManager = await dataService.getExtensionDataManager(extensionContext.id, accessToken);
  }

  return extensionDataManager!;
}

export async function getAvailableMembers<T = unknown>(): Promise<T> {
  try {
    const dataManager = await getExtensionDataManager();
    const data = await dataManager.getValue<T>('availableMembers');
    return (data ?? ({} as T)) as T;
  } catch (error) {
    console.error('Failed to get available members:', error);
    return {} as T;
  }
}

export async function saveAvailableMembers<T>(settings: T): Promise<boolean> {
  try {
    const dataManager = await getExtensionDataManager();
    await dataManager.setValue('availableMembers', settings);
    return true;
  } catch (error) {
    console.error('Failed to save available members:', error);
    return false;
  }
}
