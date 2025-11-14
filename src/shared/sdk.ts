import * as SDK from 'azure-devops-extension-sdk';

let initialized = false;

export async function initExtension(applyTheme: boolean = true): Promise<void> {
  if (!initialized) {
    SDK.init({ applyTheme });
    initialized = true;
  }
  await SDK.ready();
}

export function getSdk() {
  return SDK;
}
