let extensionDataManager = null;

async function getDataService(SDK) {
  if (!extensionDataManager) {
    try {
      const accessToken = await SDK.getAccessToken();
      const extensionContext = SDK.getExtensionContext();
      const extensionDataService = await SDK.getService('ms.vss-web.data-service');
      extensionDataManager = await extensionDataService.getExtensionDataManager(extensionContext.id, accessToken);
    } catch (error) {
      console.error('Failed to initialize data service:', error);
      throw error;
    }
  }
  return extensionDataManager;
}

async function getAvailableMembers(SDK) {
  try {
    const dataService = await getDataService(SDK);
    const data = await dataService.getValue('availableMembers');
    return data || {};
  } catch (error) {
    console.error('Failed to get available members:', error);
    return {};
  }
}

async function saveAvailableMembers(SDK, settings) {
  try {
    const dataService = await getDataService(SDK);
    await dataService.setValue('availableMembers', settings);
    return true;
  } catch (error) {
    console.error('Failed to save available members:', error);
    return false;
  }
}

if (typeof window !== 'undefined') {
  window.getAvailableMembers = getAvailableMembers;
  window.saveAvailableMembers = saveAvailableMembers;
}

export { getAvailableMembers, saveAvailableMembers };
