import type { AnyAction } from 'redux';

import {
    bootSuccess,
    getShareAccessOptionsSuccess,
    inviteAcceptSuccess,
    inviteCreationSuccess,
    inviteRemoveSuccess,
    newUserInvitePromoteSuccess,
    newUserInviteRemoveSuccess,
    shareAccessChange,
    shareDeleteSync,
    shareEditMemberAccessSuccess,
    shareEditSync,
    shareEvent,
    shareLeaveSuccess,
    shareRemoveMemberAccessSuccess,
    sharesSync,
    syncSuccess,
    vaultCreationFailure,
    vaultCreationIntent,
    vaultCreationSuccess,
    vaultDeleteFailure,
    vaultDeleteIntent,
    vaultDeleteSuccess,
    vaultEditFailure,
    vaultEditIntent,
    vaultEditSuccess,
    vaultTransferOwnershipSuccess,
} from '@proton/pass/store/actions';
import { sanitizeWithCallbackAction } from '@proton/pass/store/actions/with-callback';
import withOptimistic from '@proton/pass/store/optimistic/with-optimistic';
import type { Share } from '@proton/pass/types';
import { ShareRole, ShareType } from '@proton/pass/types';
import type { NewUserPendingInvite, PendingInvite, ShareMember } from '@proton/pass/types/data/invites';
import { objectDelete } from '@proton/pass/utils/object/delete';
import { fullMerge, partialMerge } from '@proton/pass/utils/object/merge';
import { getEpoch } from '@proton/pass/utils/time/get-epoch';

export type ShareItem<T extends ShareType = ShareType> = Share<T> & {
    invites?: PendingInvite[];
    newUserInvites?: NewUserPendingInvite[];
    members?: ShareMember[];
};

export type WithItemCount<T> = T & { count: number };
export type VaultShareItem = ShareItem<ShareType.Vault>;

export type SharesState = { [shareId: string]: ShareItem };

/**
 * Share actions are optimistic but do not allow retries
 * as of now (no fail optimistic matcher defined)
 */
export const withOptimisticShares = withOptimistic<SharesState>(
    [
        {
            initiate: vaultCreationIntent.optimisticMatch,
            revert: [vaultCreationFailure.optimisticMatch, vaultCreationSuccess.optimisticMatch],
        },
        {
            initiate: vaultEditIntent.optimisticMatch,
            revert: vaultEditFailure.optimisticMatch,
            commit: vaultEditSuccess.optimisticMatch,
        },
        {
            initiate: vaultDeleteIntent.optimisticMatch,
            revert: vaultDeleteFailure.optimisticMatch,
            commit: vaultDeleteSuccess.optimisticMatch,
        },
    ],
    (state = {}, action: AnyAction) => {
        if (bootSuccess.match(action) && action.payload.sync?.shares !== undefined) {
            return action.payload.sync.shares;
        }

        if (syncSuccess.match(action)) {
            return action.payload.shares;
        }

        if (sharesSync.match(action)) {
            return fullMerge(state, action.payload.shares);
        }

        if (shareEvent.match(action) && state !== null) {
            const { shareId, Events } = action.payload;
            const currentEventId = state[shareId].eventId;

            return Events.LatestEventID === currentEventId
                ? state
                : partialMerge(state, {
                      [action.payload.shareId]: { eventId: action.payload.Events.LatestEventID },
                  });
        }

        if (vaultCreationIntent.match(action)) {
            const { id, content } = action.payload;

            return fullMerge(state, {
                [id]: {
                    content: content,
                    createTime: getEpoch(),
                    eventId: '',
                    newUserInvitesReady: 0,
                    owner: true,
                    shared: false,
                    shareId: id,
                    shareRoleId: ShareRole.ADMIN,
                    targetId: id,
                    targetMaxMembers: 1,
                    targetMembers: 1,
                    targetType: ShareType.Vault,
                    vaultId: id,
                },
            });
        }

        if (vaultCreationSuccess.match(action)) {
            const { share } = action.payload;
            return fullMerge(state, { [share.shareId]: share });
        }

        if (vaultEditIntent.match(action)) {
            const { id, content } = action.payload;
            return partialMerge(state, { [id]: { content } });
        }

        if (shareEditSync.match(action)) {
            const { id, share } = action.payload;
            return fullMerge(state, { [id]: share });
        }

        if (vaultDeleteIntent.match(action)) {
            return objectDelete(state, action.payload.id);
        }

        if (shareDeleteSync.match(action)) {
            return objectDelete(state, action.payload.shareId);
        }

        if (vaultTransferOwnershipSuccess.match(action)) {
            const { shareId, userShareId } = action.payload;
            const members = (state[shareId].members ?? []).map((member) => {
                if (member.owner) return { ...member, owner: false };
                if (member.shareId === userShareId) return { ...member, owner: true };
                return member;
            });

            return partialMerge(state, { [shareId]: { owner: false, shareRoleId: ShareRole.ADMIN, members } });
        }

        if (inviteCreationSuccess.match(action)) {
            return action.payload.withVaultCreation
                ? partialMerge(state, { [action.payload.shareId]: { ...action.payload.share, shared: true } })
                : partialMerge(state, { [action.payload.shareId]: { shared: true } });
        }

        if (newUserInvitePromoteSuccess.match(action)) {
            const { shareId, invites, newUserInvites } = action.payload;
            return partialMerge(state, { [shareId]: { newUserInvites, invites } });
        }

        if (inviteRemoveSuccess.match(action)) {
            const { shareId, inviteId } = action.payload;
            const { members = [], invites = [], newUserInvites = [] } = state[shareId];

            const update = invites.filter((invite) => invite.inviteId !== inviteId);
            const shared = members.length > 1 || update.length > 0 || newUserInvites.length > 0;

            return partialMerge(state, { [shareId]: { invites: update, shared } });
        }

        if (newUserInviteRemoveSuccess.match(action)) {
            const { shareId, newUserInviteId } = action.payload;
            const { members = [], invites = [], newUserInvites = [] } = state[shareId];

            const update = newUserInvites.filter((invite) => invite.newUserInviteId !== newUserInviteId);
            const shared = members.length > 1 || invites.length > 0 || update.length > 0;

            return partialMerge(state, { [shareId]: { newUserInvites: update, shared } });
        }

        if (shareAccessChange.match(action)) {
            const { shareId, ...shareAccessOptions } = action.payload;
            return partialMerge(state, { [shareId]: shareAccessOptions });
        }

        if (getShareAccessOptionsSuccess.match(action)) {
            const { shareId, invites, newUserInvites, members } = action.payload;
            return partialMerge(state, { [shareId]: { invites, members, newUserInvites } });
        }

        if (shareEditMemberAccessSuccess.match(action)) {
            const { shareId, userShareId, shareRoleId } = action.payload;
            const members = state[shareId].members ?? [];

            return partialMerge(state, {
                [shareId]: {
                    members: members.map<ShareMember>((member) =>
                        member.shareId === userShareId ? { ...member, shareRoleId } : member
                    ),
                },
            });
        }

        if (shareRemoveMemberAccessSuccess.match(action)) {
            const { shareId, userShareId } = action.payload;
            return partialMerge(state, {
                [shareId]: {
                    // FIXME: state not properly updating
                    members: (state[shareId]?.members ?? []).filter(({ shareId }) => shareId !== userShareId),
                },
            });
        }

        if (inviteAcceptSuccess.match(action)) {
            return partialMerge(state, { [action.payload.share.shareId]: action.payload.share });
        }

        if (shareLeaveSuccess.match(action)) {
            return objectDelete(state, action.payload.shareId);
        }

        return state;
    },
    { sanitizeAction: sanitizeWithCallbackAction }
);

export default withOptimisticShares.reducer;
