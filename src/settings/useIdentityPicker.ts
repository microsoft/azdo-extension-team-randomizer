import * as React from 'react';
import {
  IPeoplePickerProvider,
  IIdentity as IPickerIdentity,
  IPersonaConnections
} from 'azure-devops-ui/IdentityPicker';
import { PeoplePickerProvider as AzurePeoplePickerProvider } from 'azure-devops-extension-api/Identities/IdentityProvider';
import { logger } from '../shared/logger';
import {
  createCustomIdentityFromInput,
  isCustomIdentity,
  isUserIdentity,
  mapMemberToPickerIdentity,
  mapStoredMemberToPickerIdentity
} from './memberUtils';
import { StoredMembersByTeam } from './types';
import { MemberViewModel } from '../shared/types';

const log = logger.createChild('useIdentityPicker');

export interface UseIdentityPickerOptions {
  projectMembers: MemberViewModel[];
  members: MemberViewModel[];
  customMembers: StoredMembersByTeam;
}

export interface UseIdentityPickerResult {
  provider: IPeoplePickerProvider;
  availableIdentities: IPickerIdentity[];
}

export function useIdentityPicker(options: UseIdentityPickerOptions): UseIdentityPickerResult {
  const { projectMembers, members, customMembers } = options;
  const [remoteProvider, setRemoteProvider] = React.useState<AzurePeoplePickerProvider | undefined>();

  React.useEffect(() => {
    const provider = new AzurePeoplePickerProvider();
    setRemoteProvider(provider);
  }, []);

  const availableIdentities = React.useMemo(() => {
    const identityMap = new Map<string, IPickerIdentity>();

    const register = (identity: IPickerIdentity | undefined) => {
      if (identity) {
        identityMap.set(identity.entityId.toLowerCase(), identity);
      }
    };

    projectMembers.forEach((member) => register(mapMemberToPickerIdentity(member)));
    members.forEach((member) => register(mapMemberToPickerIdentity(member)));
    Object.values(customMembers).forEach((list) => {
      list.forEach((stored) => register(mapStoredMemberToPickerIdentity(stored)));
    });

    return Array.from(identityMap.values());
  }, [projectMembers, members, customMembers]);

  const provider = React.useMemo<IPeoplePickerProvider>(() => {
    const identityMap = new Map<string, IPickerIdentity>();
    availableIdentities.forEach((identity) => {
      identityMap.set(identity.entityId.toLowerCase(), identity);
    });

    const emptyConnections: IPersonaConnections = {
      directReports: [],
      managers: [],
      successors: []
    };

    const addIdentity = (
      collection: Map<string, IPickerIdentity>,
      identity: IPickerIdentity | undefined,
      selectedSet: Set<string>
    ) => {
      if (!identity || selectedSet.has(identity.entityId.toLowerCase())) {
        return;
      }

      const key = identity.entityId.toLowerCase();
      if (!collection.has(key)) {
        collection.set(key, identity);
      }
    };

    const invokeRemote = async <T>(
      operation: string,
      fallback: T,
      fn: (() => PromiseLike<T> | T) | undefined
    ): Promise<T> => {
      if (!fn) {
        return fallback;
      }

      try {
        return await fn();
      } catch (error) {
        log.warn(`Identity provider ${operation} failed`, error);
        return fallback;
      }
    };

    return {
      onFilterIdentities: async (filter: string, selectedItems?: IPickerIdentity[]) => {
        const selectedSet = new Set<string>((selectedItems ?? []).map((item) => item.entityId.toLowerCase()));
        const combined = new Map<string, IPickerIdentity>();
        const trimmedRaw = filter.trim();
        const trimmed = trimmedRaw.toLowerCase();

        if (trimmedRaw) {
          const customIdentity = createCustomIdentityFromInput(trimmedRaw);
          addIdentity(combined, customIdentity, selectedSet);
        }

        const remoteResults = await invokeRemote<IPickerIdentity[]>(
          'onFilterIdentities',
          [],
          remoteProvider ? () => remoteProvider.onFilterIdentities(filter, selectedItems) : undefined
        );

        remoteResults
          .filter((identity) => isUserIdentity(identity))
          .forEach((identity) => addIdentity(combined, identity, selectedSet));

        const localMatches = !trimmed
          ? availableIdentities.slice(0, 20)
          : availableIdentities.filter((identity: IPickerIdentity) => {
              const displayName = identity.displayName?.toLowerCase() ?? '';
              const email = identity.mail?.toLowerCase() ?? '';
              const isRelevant = displayName.includes(trimmed) || email.includes(trimmed);
              return isRelevant && (isUserIdentity(identity) || isCustomIdentity(identity));
            });

        localMatches.forEach((identity) => addIdentity(combined, identity, selectedSet));

        return Array.from(combined.values());
      },

      onEmptyInputFocus: async () => {
        const combined = new Map<string, IPickerIdentity>();
        const selectedSet = new Set<string>();

        const remote = await invokeRemote<IPickerIdentity[]>(
          'onEmptyInputFocus',
          [],
          remoteProvider?.onEmptyInputFocus ? () => remoteProvider.onEmptyInputFocus!() : undefined
        );

        remote
          .filter((identity) => isUserIdentity(identity))
          .forEach((identity) => addIdentity(combined, identity, selectedSet));

        availableIdentities
          .filter((identity: IPickerIdentity) => isUserIdentity(identity) || isCustomIdentity(identity))
          .slice(0, 10)
          .forEach((identity) => addIdentity(combined, identity, selectedSet));

        return Array.from(combined.values());
      },

      getEntityFromUniqueAttribute: async (entityId: string) => {
        const key = entityId.toLowerCase();
        const local = identityMap.get(key);
        if (local) {
          return local;
        }

        const remote = await invokeRemote<IPickerIdentity | undefined>(
          'getEntityFromUniqueAttribute',
          undefined,
          remoteProvider ? () => remoteProvider.getEntityFromUniqueAttribute(entityId) : undefined
        );

        if (remote && isUserIdentity(remote)) {
          return remote;
        }

        return createCustomIdentityFromInput(entityId);
      },

      onRequestConnectionInformation: (entity: IPickerIdentity, getDirectReports?: boolean) => {
        if (!remoteProvider) {
          return emptyConnections;
        }

        return invokeRemote<IPersonaConnections>('onRequestConnectionInformation', emptyConnections, () =>
          remoteProvider.onRequestConnectionInformation(entity, getDirectReports)
        );
      },

      addIdentitiesToMRU: remoteProvider?.addIdentitiesToMRU
        ? async (identities) =>
            invokeRemote<boolean>('addIdentitiesToMRU', false, () => remoteProvider.addIdentitiesToMRU!(identities))
        : undefined,

      removeIdentitiesFromMRU: remoteProvider?.removeIdentitiesFromMRU
        ? async (identities) =>
            invokeRemote<boolean>('removeIdentitiesFromMRU', false, () =>
              remoteProvider.removeIdentitiesFromMRU!(identities)
            )
        : undefined
    };
  }, [availableIdentities, remoteProvider]);

  return { provider, availableIdentities };
}
