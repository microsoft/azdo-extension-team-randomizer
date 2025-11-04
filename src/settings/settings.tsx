import * as React from 'react';
import { Page } from 'azure-devops-ui/Page';
import { Header, TitleSize } from 'azure-devops-ui/Header';
import { Spinner, SpinnerSize } from 'azure-devops-ui/Spinner';
import { showRootComponent } from '../common';
import { useSettingsState } from './useSettingsState';
import { TeamConfigurationCard, MembersCard, StatusBanner } from './Components';
import './settings.scss';

const SettingsPage: React.FC = () => {
  const state = useSettingsState();
  const {
    isInitializing,
    status,
    dismissStatus,
    teams,
    selectedTeamId,
    dropdownSelection,
    handleTeamSelection,
    identityPickerProvider,
    selectedIdentity,
    handleIdentityChange,
    handleResolveIdentity,
    handleAddMember,
    isTeamLoading,
    members,
    selectionFingerprint,
    memberColumns,
    memberItemProvider,
    tableBehaviors,
    membersCardCommands
  } = state;

  if (isInitializing) {
    return (
      <div className='settings-page'>
        <Spinner className='bolt-center' size={SpinnerSize.large} label='Loading settings...' />
      </div>
    );
  }

  return (
    <Page className='settings-page'>
      <Header
        title='Team Member Randomizer Settings'
        titleSize={TitleSize.Large}
        description='Manage available members for each team.'
      />
      <div className='settings-container'>
        <StatusBanner status={status} onDismiss={dismissStatus} />
        <TeamConfigurationCard
          teams={teams}
          selectedTeamId={selectedTeamId}
          dropdownSelection={dropdownSelection}
          onTeamSelect={handleTeamSelection}
          identityPickerProvider={identityPickerProvider}
          selectedIdentity={selectedIdentity}
          onIdentityChange={handleIdentityChange}
          onResolveIdentity={handleResolveIdentity}
          onAddMember={handleAddMember}
        />
        <MembersCard
          selectedTeamId={selectedTeamId}
          isTeamLoading={isTeamLoading}
          members={members}
          selectionFingerprint={selectionFingerprint}
          memberColumns={memberColumns}
          memberItemProvider={memberItemProvider}
          tableBehaviors={tableBehaviors}
          commands={membersCardCommands}
        />
      </div>
    </Page>
  );
};

showRootComponent(<SettingsPage />);
