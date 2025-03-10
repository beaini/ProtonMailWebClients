import { getAppFromPathnameSafe } from '@proton/shared/lib/apps/slugHelper';
import { APPS, COUPON_CODES, PLANS } from '@proton/shared/lib/constants';
import { getHasCoupon, getPlan, hasMonthly, isManagedExternally } from '@proton/shared/lib/helpers/subscription';
import { ProtonConfig, SubscriptionModel, UserModel } from '@proton/shared/lib/interfaces';

interface Props {
    subscription: SubscriptionModel;
    protonConfig: ProtonConfig;
    user: UserModel;
}

const isEligible = ({ subscription, protonConfig, user }: Props) => {
    const parentApp = getAppFromPathnameSafe(window.location.pathname);
    const plan = getPlan(subscription);
    const hasVPN = plan?.Name === PLANS.VPN;
    const isMonthly = hasMonthly(subscription);
    const hasValidApp =
        protonConfig?.APP_NAME === APPS.PROTONVPN_SETTINGS ||
        (protonConfig?.APP_NAME === APPS.PROTONACCOUNT && parentApp === APPS.PROTONVPN_SETTINGS);
    const { canPay, isDelinquent } = user;
    const notDelinquent = !isDelinquent;
    const isNotExternal = !isManagedExternally(subscription);
    const hasBFOffer = getHasCoupon(subscription, COUPON_CODES.BLACK_FRIDAY_2023);

    return hasValidApp && isNotExternal && canPay && notDelinquent && hasVPN && isMonthly && !hasBFOffer;
};

export default isEligible;
