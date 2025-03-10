import { c, msgid } from 'ttag';

import { BRAND_NAME, PASS_APP_NAME, PLANS } from '@proton/shared/lib/constants';
import isTruthy from '@proton/utils/isTruthy';

import { PlanCardFeature, PlanCardFeatureDefinition } from './interface';

export const getPassAppFeature = (): PlanCardFeatureDefinition => {
    return {
        text: PASS_APP_NAME,
        included: true,
        icon: 'brand-proton',
        tooltip: c('tooltip')
            .t`${PASS_APP_NAME}: Secure logins on all your devices. Includes unlimited aliases, sharing, integrated 2FA, and more.`,
    };
};

export const getCustomDomains = (): PlanCardFeatureDefinition => {
    return {
        text: c('new_plans: feature').t`Custom domains for email aliases`,
        included: true,
    };
};

export const getProtonPassFeature = (n: 'unlimited' | number = 'unlimited'): PlanCardFeatureDefinition => {
    return {
        text:
            n === 'unlimited'
                ? c('new_plans: feature').t`${PASS_APP_NAME} with unlimited hide-my-email aliases`
                : c('new_plans: feature').ngettext(
                      msgid`${PASS_APP_NAME} with ${n} hide-my-email alias`,
                      `${PASS_APP_NAME} with ${n} hide-my-email aliases`,
                      n
                  ),
        icon: 'pass-all-vaults',
        included: true,
        hideInDowngrade: true,
    };
};

export const getLoginsAndNotesText = () => {
    return c('new_plans: feature').t`Unlimited logins and notes`;
};

export const getLoginsAndNotes = (): PlanCardFeatureDefinition => {
    return {
        text: getLoginsAndNotesText(),
        icon: 'note',
        included: true,
        hideInDowngrade: true,
    };
};

export const getItems = (): PlanCardFeatureDefinition => {
    return {
        text: c('new_plans: feature').t`Organize items with multiple vaults`,
        included: true,
    };
};

export const getCreditCards = (): PlanCardFeatureDefinition => {
    return {
        text: c('new_plans: feature').t`Autofill credit cards (coming soon)`,
        included: true,
    };
};

export const getDevicesText = () => {
    return c('new_plans: feature').t`Unlimited devices`;
};

export const getDevices = (): PlanCardFeatureDefinition => {
    return {
        text: getDevicesText(),
        icon: 'mobile',
        included: true,
        hideInDowngrade: true,
    };
};

export const getNHideMyEmailAliasesText = (n: number) => {
    return c('new_plans: feature').ngettext(msgid`${n} hide-my-email alias`, `${n} hide-my-email aliases`, n);
};

export const getUnlimitedHideMyEmailAliasesText = () => {
    return c('new_plans: feature').t`Unlimited hide-my-email aliases`;
};

export const getHideMyEmailAliases = (n: number | 'unlimited'): PlanCardFeatureDefinition => {
    return {
        text: n === 'unlimited' ? getUnlimitedHideMyEmailAliasesText() : getNHideMyEmailAliasesText(10),
        tooltip: c('new_plans: tooltip')
            .t`Unique, on-the-fly email addresses that protect your online identity and let you control what lands in your inbox. From SimpleLogin by ${BRAND_NAME}.`,
        included: true,
        icon: 'eye-slash',
    };
};

export const get2FAAuthenticatorText = () => {
    return c('new_plans: feature').t`Integrated 2FA authenticator`;
};

export const get2FAAuthenticator = (included: boolean = false): PlanCardFeatureDefinition => {
    return {
        text: get2FAAuthenticatorText(),
        included,
        icon: 'key',
    };
};

export const getVaults = (n: number): PlanCardFeatureDefinition => {
    return {
        text: c('new_plans: feature').ngettext(msgid`${n} vault`, `${n} vaults`, n),
        tooltip: c('new_plans: tooltip')
            .t`Like a folder, a vault is a convenient way to organize your items. Sharing vaults with friends and family is in the works.`,
        included: true,
        icon: 'vault',
    };
};

export const getCustomFields = (included: boolean = false): PlanCardFeatureDefinition => {
    return {
        text: c('new_plans: feature').t`Custom fields`,
        included,
        icon: 'pen-square',
    };
};

export const getSharing = (included: boolean = false): PlanCardFeatureDefinition => {
    return {
        text: included
            ? c('new_plans: feature').t`Vault and Item sharing (coming soon)`
            : c('new_plans: feature').t`Vault and Item sharing`,
        included,
        icon: 'arrow-up-from-square',
        status: 'coming-soon',
    };
};

const getVaultSharingText = (n: number) => {
    return c('new_plans: feature').ngettext(
        msgid`Vault sharing (up to ${n} person)`,
        `Vault sharing (up to ${n} people)`,
        n
    );
};

export const getVaultSharing = (n: number): PlanCardFeatureDefinition => {
    return {
        text: getVaultSharingText(n),
        icon: 'arrow-up-from-square',
        included: true,
        hideInDowngrade: true,
    };
};

export const getDataBreachMonitoring = (included: boolean = false): PlanCardFeatureDefinition => {
    return {
        text: included
            ? c('new_plans: feature').t`Data breach monitoring (coming soon)`
            : c('new_plans: feature').t`Data breach monitoring`,
        included,
        icon: 'shield',
        status: 'coming-soon',
    };
};

export const FREE_PASS_ALIASES = 10;
export const FREE_VAULTS = 1;

export const PASS_PLUS_VAULTS = 20;

export const getPassFeatures = (passVaultSharingEnabled: boolean): PlanCardFeature[] => {
    return [
        {
            name: 'passwords-and-notes',
            plans: {
                [PLANS.FREE]: getLoginsAndNotes(),
                [PLANS.BUNDLE]: getLoginsAndNotes(),
                [PLANS.MAIL]: getLoginsAndNotes(),
                [PLANS.VPN]: getLoginsAndNotes(),
                [PLANS.DRIVE]: getLoginsAndNotes(),
                [PLANS.PASS_PLUS]: getLoginsAndNotes(),
                [PLANS.FAMILY]: getLoginsAndNotes(),
                [PLANS.MAIL_PRO]: getLoginsAndNotes(),
                [PLANS.BUNDLE_PRO]: getLoginsAndNotes(),
                [PLANS.VPN_PRO]: null,
                [PLANS.VPN_BUSINESS]: null,
            },
        },
        {
            name: 'devices',
            plans: {
                [PLANS.FREE]: getDevices(),
                [PLANS.BUNDLE]: getDevices(),
                [PLANS.MAIL]: getDevices(),
                [PLANS.VPN]: getDevices(),
                [PLANS.DRIVE]: getDevices(),
                [PLANS.PASS_PLUS]: getDevices(),
                [PLANS.FAMILY]: getDevices(),
                [PLANS.MAIL_PRO]: getDevices(),
                [PLANS.BUNDLE_PRO]: getDevices(),
                [PLANS.VPN_PRO]: null,
                [PLANS.VPN_BUSINESS]: null,
            },
        },
        {
            name: 'vaults',
            plans: {
                [PLANS.FREE]: getVaults(FREE_VAULTS),
                [PLANS.BUNDLE]: getVaults(PASS_PLUS_VAULTS),
                [PLANS.MAIL]: getVaults(FREE_VAULTS),
                [PLANS.VPN]: getVaults(FREE_VAULTS),
                [PLANS.DRIVE]: getVaults(FREE_VAULTS),
                [PLANS.PASS_PLUS]: getVaults(PASS_PLUS_VAULTS),
                [PLANS.FAMILY]: getVaults(PASS_PLUS_VAULTS),
                [PLANS.MAIL_PRO]: getVaults(FREE_VAULTS),
                [PLANS.BUNDLE_PRO]: getVaults(PASS_PLUS_VAULTS),
                [PLANS.VPN_PRO]: null,
                [PLANS.VPN_BUSINESS]: null,
            },
        },
        {
            name: 'hide-my-email-aliases',
            plans: {
                [PLANS.FREE]: getHideMyEmailAliases(FREE_PASS_ALIASES),
                [PLANS.BUNDLE]: getHideMyEmailAliases('unlimited'),
                [PLANS.MAIL]: getHideMyEmailAliases(FREE_PASS_ALIASES),
                [PLANS.VPN]: getHideMyEmailAliases(FREE_PASS_ALIASES),
                [PLANS.DRIVE]: getHideMyEmailAliases(FREE_PASS_ALIASES),
                [PLANS.PASS_PLUS]: getHideMyEmailAliases('unlimited'),
                [PLANS.FAMILY]: getHideMyEmailAliases('unlimited'),
                [PLANS.MAIL_PRO]: getHideMyEmailAliases(FREE_PASS_ALIASES),
                [PLANS.BUNDLE_PRO]: getHideMyEmailAliases('unlimited'),
                [PLANS.VPN_PRO]: null,
                [PLANS.VPN_BUSINESS]: null,
            },
        },
        passVaultSharingEnabled
            ? {
                  name: 'vault-and-item-sharing',
                  plans: {
                      [PLANS.FREE]: getVaultSharing(3),
                      [PLANS.BUNDLE]: getVaultSharing(10),
                      [PLANS.MAIL]: getVaultSharing(3),
                      [PLANS.VPN]: getVaultSharing(3),
                      [PLANS.DRIVE]: getVaultSharing(3),
                      [PLANS.PASS_PLUS]: getVaultSharing(10),
                      [PLANS.FAMILY]: getVaultSharing(10),
                      [PLANS.MAIL_PRO]: getVaultSharing(3),
                      [PLANS.BUNDLE_PRO]: getVaultSharing(10),
                      [PLANS.VPN_PRO]: null,
                      [PLANS.VPN_BUSINESS]: null,
                  },
              }
            : null,
        {
            name: '2fa-authenticator',
            plans: {
                [PLANS.FREE]: get2FAAuthenticator(),
                [PLANS.BUNDLE]: get2FAAuthenticator(true),
                [PLANS.MAIL]: get2FAAuthenticator(),
                [PLANS.VPN]: get2FAAuthenticator(),
                [PLANS.DRIVE]: get2FAAuthenticator(),
                [PLANS.PASS_PLUS]: get2FAAuthenticator(true),
                [PLANS.FAMILY]: get2FAAuthenticator(true),
                [PLANS.MAIL_PRO]: get2FAAuthenticator(),
                [PLANS.BUNDLE_PRO]: get2FAAuthenticator(true),
                [PLANS.VPN_PRO]: null,
                [PLANS.VPN_BUSINESS]: null,
            },
        },
        {
            name: 'forwarding-mailboxes',
            plans: {
                [PLANS.FREE]: getCustomFields(),
                [PLANS.BUNDLE]: getCustomFields(true),
                [PLANS.MAIL]: getCustomFields(),
                [PLANS.VPN]: getCustomFields(),
                [PLANS.DRIVE]: getCustomFields(),
                [PLANS.PASS_PLUS]: getCustomFields(true),
                [PLANS.FAMILY]: getCustomFields(true),
                [PLANS.MAIL_PRO]: getCustomFields(),
                [PLANS.BUNDLE_PRO]: getCustomFields(true),
                [PLANS.VPN_PRO]: null,
                [PLANS.VPN_BUSINESS]: null,
            },
        },
        passVaultSharingEnabled
            ? null
            : {
                  name: 'vault-and-item-sharing',
                  plans: {
                      [PLANS.FREE]: getSharing(),
                      [PLANS.BUNDLE]: getSharing(true),
                      [PLANS.MAIL]: getSharing(),
                      [PLANS.VPN]: getSharing(),
                      [PLANS.DRIVE]: getSharing(),
                      [PLANS.PASS_PLUS]: getSharing(true),
                      [PLANS.FAMILY]: getSharing(true),
                      [PLANS.MAIL_PRO]: getSharing(),
                      [PLANS.BUNDLE_PRO]: getSharing(true),
                      [PLANS.VPN_PRO]: null,
                      [PLANS.VPN_BUSINESS]: null,
                  },
              },
        {
            name: 'data-breach-monitoring',
            plans: {
                [PLANS.FREE]: getDataBreachMonitoring(),
                [PLANS.BUNDLE]: getDataBreachMonitoring(true),
                [PLANS.MAIL]: getDataBreachMonitoring(),
                [PLANS.VPN]: getDataBreachMonitoring(),
                [PLANS.DRIVE]: getDataBreachMonitoring(),
                [PLANS.PASS_PLUS]: getDataBreachMonitoring(true),
                [PLANS.FAMILY]: getDataBreachMonitoring(true),
                [PLANS.MAIL_PRO]: getDataBreachMonitoring(),
                [PLANS.BUNDLE_PRO]: getDataBreachMonitoring(true),
                [PLANS.VPN_PRO]: null,
                [PLANS.VPN_BUSINESS]: null,
            },
        },
    ].filter(isTruthy);
};

export const getPassIdentityFeature = (): PlanCardFeatureDefinition => {
    return {
        text: PASS_APP_NAME,
        tooltip: c('new_plans: tooltip').t`Password management and identity protection`,
        included: true,
        icon: 'pass-all-vaults',
    };
};
