import * as React from 'react';
import { showRootComponent } from '../common';
import './panel.scss';
import { usePanelState } from './usePanelState';
import {
  CurrentMemberCard,
  TeamSelector,
  StatusBanner,
  SelectionSummary,
  SelectionActions,
  MembersTable,
  DailyContentCard
} from './Components';
import { Spinner, SpinnerSize } from 'azure-devops-ui/Spinner';

const PanelPage: React.FC = () => {
  const state = usePanelState();

  if (state.isInitializing) {
    return (
      <div className='panel-loading'>
        <Spinner size={SpinnerSize.large} label='Loading randomizer...' className='bolt-center' />
      </div>
    );
  }

  return (
    <div className='panel-page'>
      <div className='panel-container'>
        <DailyContentCard
          title='Question of the Day'
          value={state.questionOfDay?.text}
          isLoading={state.isQuestionLoading}
          onRefresh={state.actions.refreshQuestionOfDay}
          loadingLabel='Loading question...'
          emptyMessage="Select refresh to load today's question."
          testId='question-of-day-card'
        />

        <DailyContentCard
          title='Holiday of the Day'
          value={state.holidayOfDay}
          isLoading={state.isHolidayLoading}
          onRefresh={state.actions.refreshHolidayOfDay}
          loadingLabel='Loading holiday...'
          emptyMessage="Select refresh to load today's holiday."
          testId='holiday-of-day-card'
        />

        <CurrentMemberCard member={state.currentMember} isLoading={state.isTeamLoading} />
        <StatusBanner status={state.status} onDismiss={state.actions.dismissStatus} />
        <TeamSelector teams={state.teams} selection={state.dropdownSelection} onSelect={state.actions.selectTeam} />
        <SelectionSummary
          total={state.totalMembers}
          remaining={state.remainingCount}
          completed={state.completedCount}
        />
        <SelectionActions
          onPrevious={state.actions.selectPrevious}
          onRandomize={state.actions.randomize}
          onReset={state.actions.resetSelections}
          disablePrevious={state.disablePrevious}
          disableRandomize={state.disableRandomize}
          disableReset={state.disableReset}
          isSelectionCycleComplete={state.isSelectionCycleComplete}
        />
        <div className='panel-table-wrapper'>
          <MembersTable
            members={state.members}
            currentMemberId={state.currentMemberId}
            completedMemberIds={state.completedMemberIds}
            isTeamLoading={state.isTeamLoading}
          />
        </div>
      </div>
    </div>
  );
};

showRootComponent(<PanelPage />);
