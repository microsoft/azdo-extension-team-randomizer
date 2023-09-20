function buttonHandler(dialogService, extensionInfo, properties) {
  const options = {
    title: "Team Members",
    width: 300,
    height: 600,
    buttons: null
  };
  initStorage();
  dialogService.openDialog(extensionInfo.publisherId + "." + extensionInfo.extensionId + ".popupDialog", options, { properties });
}
