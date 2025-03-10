import type { ExtensionEndpoint, TabId } from '@proton/pass/types';

export const bootRequest = () => 'worker::boot';
export const syncRequest = () => 'worker::sync';
export const wakeupRequest = (endpoint: ExtensionEndpoint, tabId: TabId) => `worker::wakeup-${endpoint}-${tabId}`;

export const vaultCreate = (shareId: string) => `vault::create::request::${shareId}`;
export const vaultEdit = (shareId: string) => `vault::edit::request::${shareId}`;
export const vaultDelete = (shareId: string) => `vault::delete::request::${shareId}`;
export const vaultSetPrimary = (shareId: string) => `vault::et::primary::request-${shareId}`;
export const vaultTransferOwnerRequest = (userShareId: string) => `vault::transfer:owner::${userShareId}`;

export const importItems = () => `import-items`;

export const unlockSession = `unlock-session`;
export const settingsEdit = (group: string) => `settings::edit::${group}`;
export const reportProblem = `report-problem-request`;

export const aliasOptionsRequest = (shareId: string) => `alias::options::${shareId}`;
export const aliasDetailsRequest = (aliasEmail: string) => `alias::details::${aliasEmail}`;

export const shareRemoveMemberRequest = (userShareId: string) => `share::members::remove::${userShareId}`;
export const shareEditMemberRoleRequest = (userShareId: string) => `share::members::edit-role::${userShareId}`;
export const shareLeaveRequest = (shareId: string) => `share::leave::${shareId}`;
export const shareAccessOptionsRequest = (shareId: string) => `share::access-options::${shareId}`;

export const inviteResendRequest = (inviteId: string) => `invite::resend::${inviteId}`;
export const inviteAcceptRequest = (token: string) => `invite::accept::${token}`;
export const inviteRejectRequest = (token: string) => `invite::reject::${token}`;
export const inviteRemoveRequest = (inviteId: string) => `invite::remove::${inviteId}`;

export const newUserInvitePromoteRequest = (newUserInviteId: string) => `new-user-invite::promote::${newUserInviteId}`;
export const newUserInviteRemoveRequest = (newUserInviteId: string) => `new-user-invite::remove::${newUserInviteId}`;

export const userAccessRequest = (userId: string) => `user::access::${userId}`;
export const userFeaturesRequest = (userId: string) => `user::features::${userId}`;
