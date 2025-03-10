import { FormEvent, useEffect, useRef, useState } from 'react';

import { c } from 'ttag';

import { Button } from '@proton/atoms';
import { getSimplePriceString } from '@proton/components/components/price/helper';
import { FeatureCode } from '@proton/components/containers';
import { getShortBillingText } from '@proton/components/containers/payments/helper';
import VPNPassPromotionButton from '@proton/components/containers/payments/subscription/VPNPassPromotionButton';
import usePaymentToken from '@proton/components/containers/payments/usePaymentToken';
import { PAYMENT_METHOD_TYPES } from '@proton/components/payments/core';
import {
    AmountAndCurrency,
    ExistingPayment,
    TokenPaymentMethod,
    WrappedCardPayment,
} from '@proton/components/payments/core/interface';
import { useLoading } from '@proton/hooks';
import metrics, { observeApiError } from '@proton/metrics';
import { WebPaymentsSubscriptionStepsTotal } from '@proton/metrics/types/web_payments_subscription_steps_total_v1.schema';
import { checkSubscription, deleteSubscription, subscribe } from '@proton/shared/lib/api/payments';
import { getShouldCalendarPreventSubscripitionChange, willHavePaidMail } from '@proton/shared/lib/calendar/plans';
import {
    APPS,
    APP_NAMES,
    CYCLE,
    DEFAULT_CURRENCY,
    DEFAULT_CYCLE,
    PASS_APP_NAME,
    PLANS,
    PLAN_NAMES,
    PLAN_TYPES,
} from '@proton/shared/lib/constants';
import { API_CUSTOM_ERROR_CODES } from '@proton/shared/lib/errors';
import { canUpsellToVPNPassBundle } from '@proton/shared/lib/helpers/blackfriday';
import { getCheckout, getIsCustomCycle, getOptimisticCheckResult } from '@proton/shared/lib/helpers/checkout';
import { toMap } from '@proton/shared/lib/helpers/object';
import { hasBonuses } from '@proton/shared/lib/helpers/organization';
import { getPlanFromCheckout, hasPlanIDs, supportAddons } from '@proton/shared/lib/helpers/planIDs';
import { captureMessage } from '@proton/shared/lib/helpers/sentry';
import { getInitials } from '@proton/shared/lib/helpers/string';
import { getPrimaryPlan, hasMigrationDiscount, hasNewVisionary, hasVPN } from '@proton/shared/lib/helpers/subscription';
import {
    Audience,
    Currency,
    Cycle,
    PlanIDs,
    PlansMap,
    Renew,
    SubscriptionCheckResponse,
} from '@proton/shared/lib/interfaces';
import { getSentryError } from '@proton/shared/lib/keys';
import { FREE_PLAN, getFreeCheckResult } from '@proton/shared/lib/subscription/freePlans';
import { hasPaidMail } from '@proton/shared/lib/user/helpers';
import clsx from '@proton/utils/clsx';
import debounce from '@proton/utils/debounce';
import isTruthy from '@proton/utils/isTruthy';

import {
    Icon,
    ModalProps,
    ModalTwo,
    ModalTwoContent,
    ModalTwoFooter,
    ModalTwoHeader,
    Tooltip,
} from '../../../components';
import {
    useApi,
    useConfig,
    useEventManager,
    useFeature,
    useGetCalendars,
    useModals,
    useNotifications,
    useOrganization,
    usePlans,
    useSubscription,
    useUser,
    useVPNServersCount,
} from '../../../hooks';
import GenericError from '../../error/GenericError';
import LossLoyaltyModal from '../LossLoyaltyModal';
import MemberDowngradeModal from '../MemberDowngradeModal';
import Payment from '../Payment';
import PaymentGiftCode from '../PaymentGiftCode';
import usePayment from '../usePayment';
import CalendarDowngradeModal from './CalendarDowngradeModal';
import PlanCustomization from './PlanCustomization';
import { DiscountWarningModal, NewVisionaryWarningModal } from './PlanLossWarningModal';
import PlanSelection from './PlanSelection';
import SubscriptionCycleSelector, {
    SubscriptionItemView,
    getDiscountPrice,
    getMonthlySuffix,
} from './SubscriptionCycleSelector';
import SubscriptionSubmitButton from './SubscriptionSubmitButton';
import { useCancelSubscriptionFlow } from './cancelSubscription';
import { SUBSCRIPTION_STEPS, subscriptionModalClassName } from './constants';
import { getDefaultSelectedProductPlans } from './helpers';
import SubscriptionCheckout from './modal-components/SubscriptionCheckout';
import SubscriptionThanks from './modal-components/SubscriptionThanks';
import { useCheckoutModifiers } from './useCheckoutModifiers';

import './SubscriptionModal.scss';

type Source = WebPaymentsSubscriptionStepsTotal['Labels']['source'];
type FromPlan = WebPaymentsSubscriptionStepsTotal['Labels']['fromPlan'];
type MetricsStep = WebPaymentsSubscriptionStepsTotal['Labels']['step'];

export interface Props extends Pick<ModalProps<'div'>, 'open' | 'onClose' | 'onExit'> {
    app: APP_NAMES;
    step?: SUBSCRIPTION_STEPS;
    cycle?: Cycle;
    currency?: Currency;
    planIDs?: PlanIDs;
    coupon?: string | null;
    disablePlanSelection?: boolean;
    disableThanksStep?: boolean;
    defaultAudience?: Audience;
    disableCycleSelector?: boolean;
    showUserInfo?: boolean;
    hasClose?: boolean;
    disableCloseOnEscape?: boolean;
    defaultSelectedProductPlans: ReturnType<typeof getDefaultSelectedProductPlans>;
    onSuccess?: () => void;
    fromPlan: FromPlan;
    metrics: {
        source: Source;
    };
}

export interface Model {
    step: SUBSCRIPTION_STEPS;
    planIDs: PlanIDs;
    currency: Currency;
    cycle: Cycle;
    coupon?: string | null;
    gift?: string;
    initialCheckComplete: boolean;
}

const BACK: Partial<{ [key in SUBSCRIPTION_STEPS]: SUBSCRIPTION_STEPS }> = {
    [SUBSCRIPTION_STEPS.CUSTOMIZATION]: SUBSCRIPTION_STEPS.PLAN_SELECTION,
    [SUBSCRIPTION_STEPS.CHECKOUT]: SUBSCRIPTION_STEPS.CUSTOMIZATION,
};

const getCodes = ({ gift, coupon }: Model): string[] => [gift, coupon].filter(isTruthy);

const UserInfo = ({ className, app }: { className?: string; app: APP_NAMES }) => {
    const [user] = useUser();

    const [subscription] = useSubscription();
    const primaryPlan = getPrimaryPlan(subscription, app);
    const planTitle = primaryPlan?.Title || PLAN_NAMES[FREE_PLAN.Name as PLANS];

    const { Email, DisplayName, Name } = user;
    const nameToDisplay = DisplayName || Name;
    const initials = getInitials(nameToDisplay || Email || '');

    const name = Email ? Email : nameToDisplay;

    return (
        <div className={clsx('flex flex-nowrap flex-align-items-center', className)}>
            <span
                className="my-auto rounded bg-weak p-1 inline-block relative flex flex-item-noshrink min-w-custom min-h-custom"
                aria-hidden="true"
                style={{
                    '--min-w-custom': '2rem',
                    '--min-h-custom': '2rem',
                }}
            >
                <span className="m-auto">{initials}</span>
            </span>
            <div className="ml-3 flex gap-2">
                <span className="text-ellipsis" title={name}>
                    {name}
                </span>
                <span className="color-weak">({planTitle})</span>
            </div>
        </div>
    );
};

const SubscriptionModal = ({
    app,
    step = SUBSCRIPTION_STEPS.PLAN_SELECTION,
    cycle = DEFAULT_CYCLE,
    currency = DEFAULT_CURRENCY,
    coupon,
    planIDs = {},
    onClose,
    onSuccess,
    disablePlanSelection,
    disableCycleSelector: maybeDisableCycleSelector,
    showUserInfo = false,
    hasClose = true,
    disableCloseOnEscape,
    disableThanksStep,
    defaultAudience = Audience.B2C,
    defaultSelectedProductPlans,
    metrics: outerMetricsProps,
    fromPlan,
    ...rest
}: Props) => {
    const TITLE = {
        [SUBSCRIPTION_STEPS.NETWORK_ERROR]: c('Title').t`Network error`,
        [SUBSCRIPTION_STEPS.PLAN_SELECTION]: c('Title').t`Select a plan`,
        [SUBSCRIPTION_STEPS.CUSTOMIZATION]: c('Title').t`Customize your plan`,
        [SUBSCRIPTION_STEPS.CHECKOUT]: c('new_plans: title').t`Review subscription and pay`,
        [SUBSCRIPTION_STEPS.UPGRADE]: '',
        [SUBSCRIPTION_STEPS.THANKS]: '',
        [SUBSCRIPTION_STEPS.CHECKOUT_WITH_CUSTOMIZATION]: c('new_plans: title').t`Review subscription and pay`,
    };

    const metricStepMap: Record<SUBSCRIPTION_STEPS, MetricsStep> = {
        [SUBSCRIPTION_STEPS.NETWORK_ERROR]: 'network-error',
        [SUBSCRIPTION_STEPS.PLAN_SELECTION]: 'plan-selection',
        [SUBSCRIPTION_STEPS.CUSTOMIZATION]: 'customization',
        [SUBSCRIPTION_STEPS.CHECKOUT]: 'checkout',
        [SUBSCRIPTION_STEPS.UPGRADE]: 'upgrade',
        [SUBSCRIPTION_STEPS.THANKS]: 'thanks',
        [SUBSCRIPTION_STEPS.CHECKOUT_WITH_CUSTOMIZATION]: 'checkout-with-customization',
    };

    const topRef = useRef<HTMLDivElement>(null);
    const api = useApi();
    const [user] = useUser();
    const [subscription] = useSubscription();
    const { call } = useEventManager();
    const { createModal } = useModals();
    const { createNotification } = useNotifications();
    const { cancelSubscriptionModals, cancelSubscription } = useCancelSubscriptionFlow({
        subscription,
        user,
    });
    const [plans = []] = usePlans();
    const plansMap = toMap(plans, 'Name') as PlansMap;
    const [vpnServers] = useVPNServersCount();
    const [organization] = useOrganization();
    const getCalendars = useGetCalendars();
    const calendarSharingEnabled = !!useFeature(FeatureCode.CalendarSharingEnabled).feature?.Value;
    const createPaymentToken = usePaymentToken();
    const { APP_NAME } = useConfig();

    const [loading, withLoading] = useLoading();
    const [loadingCheck, withLoadingCheck] = useLoading();
    const [blockCycleSelector, withBlockCycleSelector] = useLoading();
    const [blockAccountSizeSelector, withBlockAccountSizeSelector] = useLoading();
    const [loadingGift, withLoadingGift] = useLoading();
    const [checkResult, setCheckResult] = useState<SubscriptionCheckResponse>();
    const [audience, setAudience] = useState(defaultAudience);
    const [selectedProductPlans, setSelectedProductPlans] = useState(defaultSelectedProductPlans);
    const [model, setModel] = useState<Model>({
        step,
        cycle,
        currency,
        coupon,
        planIDs,
        initialCheckComplete: false,
    });

    const isVpnB2bPlan = !!model.planIDs[PLANS.VPN_PRO] || !!model.planIDs[PLANS.VPN_BUSINESS];

    const [bitcoinValidated, setBitcoinValidated] = useState(false);
    const [awaitingBitcoinPayment, setAwaitingBitcoinPayment] = useState(false);

    const application = (() => {
        if (APP_NAME === APPS.PROTONVPN_SETTINGS) {
            return APPS.PROTONVPN_SETTINGS;
        }
        if (APP_NAME === APPS.PROTONACCOUNTLITE) {
            return APPS.PROTONACCOUNTLITE;
        }

        return APPS.PROTONACCOUNT;
    })();

    const metricsProps = {
        ...outerMetricsProps,
        step: metricStepMap[model.step],
        fromPlan,
        application,
    };

    const checkoutModifiers = useCheckoutModifiers(model, subscription, plansMap, checkResult);

    const amountDue = checkResult?.AmountDue || 0;
    const couponCode = checkResult?.Coupon?.Code;
    const couponDescription = checkResult?.Coupon?.Description;
    const creditsRemaining = (user.Credit + (checkResult?.Credit ?? 0)) / 100;

    const subscriptionCouponCode = subscription?.CouponCode;
    const latestValidCouponCodeRef = useRef('');

    const giftCodeRef = useRef<HTMLInputElement>(null);

    const abortControllerRef = useRef<AbortController>();

    const handleUnsubscribe = async () => {
        if (hasVPN(subscription)) {
            if (subscription.Renew === Renew.Disabled) {
                onClose?.();
                return;
            }

            await cancelSubscription();
            onClose?.();
            return;
        }

        // Start promise early
        const shouldCalendarPreventDowngradePromise = getShouldCalendarPreventSubscripitionChange({
            hasPaidMail: hasPaidMail(user),
            willHavePaidMail: false,
            api,
            getCalendars,
        });

        if (hasMigrationDiscount(subscription)) {
            await new Promise<void>((resolve, reject) => {
                createModal(<DiscountWarningModal type="downgrade" onClose={reject} onConfirm={resolve} />);
            });
        }

        if (await shouldCalendarPreventDowngradePromise) {
            await new Promise<void>((resolve, reject) => {
                createModal(<CalendarDowngradeModal isDowngrade onConfirm={resolve} onClose={reject} />);
            });
        }

        if (hasBonuses(organization)) {
            await new Promise<void>((resolve, reject) => {
                createModal(<LossLoyaltyModal organization={organization} onConfirm={resolve} onClose={reject} />);
            });
        }

        if (organization.UsedMembers > 1) {
            await new Promise<void>((resolve, reject) => {
                createModal(<MemberDowngradeModal organization={organization} onConfirm={resolve} onClose={reject} />);
            });
        }

        await api(deleteSubscription({}));
        await call();
        onSuccess?.();
        onClose?.();
        createNotification({ text: c('Success').t`You have successfully unsubscribed` });
    };

    const handlePlanWarnings = async (planIDs: PlanIDs) => {
        const newPlanName = Object.keys(planIDs).find((planName) =>
            plans.find((plan) => plan.Type === PLAN_TYPES.PLAN && plan.Name === planName)
        );
        if (hasNewVisionary(subscription) && PLANS.NEW_VISIONARY !== newPlanName) {
            await new Promise<void>((resolve, reject) => {
                createModal(
                    <NewVisionaryWarningModal
                        type={!newPlanName ? 'downgrade' : 'switch'}
                        onClose={reject}
                        onConfirm={resolve}
                    />
                );
            });
        }
    };

    const handleSubscribe = async (
        params: (TokenPaymentMethod | WrappedCardPayment | ExistingPayment) & AmountAndCurrency
    ) => {
        try {
            await handlePlanWarnings(model.planIDs);
        } catch (e) {
            return;
        }

        if (!hasPlanIDs(model.planIDs)) {
            return handleUnsubscribe();
        }

        const shouldCalendarPreventSubscriptionChangePromise = getShouldCalendarPreventSubscripitionChange({
            hasPaidMail: hasPaidMail(user),
            willHavePaidMail: willHavePaidMail(model.planIDs, plans),
            api,
            getCalendars,
        });

        if (await shouldCalendarPreventSubscriptionChangePromise) {
            return new Promise<void>((resolve, reject) => {
                const handleClose = () => {
                    onClose?.();
                    reject();
                };
                createModal(<CalendarDowngradeModal onConfirm={resolve} onClose={handleClose} />);
            });
        }

        // When user has an error during checkout, we need to return him to the exact same step
        // Two possible cases: CHECKOUT and CHECKOUT_WITH_CUSTOMIZATION
        const checkoutStep = model.step;
        try {
            setModel({ ...model, step: SUBSCRIPTION_STEPS.UPGRADE });
            await api({
                ...subscribe(
                    {
                        Plans: model.planIDs,
                        Codes: getCodes(model),
                        Cycle: model.cycle,
                        ...params, // Contains Payment, Amount and Currency
                    },
                    app
                ),
                timeout: 60000 * 2, // 2 minutes
            });
            await call();

            void metrics.payments_subscription_total.increment({
                ...metricsProps,
                status: 'success',
            });

            if (disableThanksStep) {
                onSuccess?.();
                onClose?.();
            } else {
                setModel({ ...model, step: SUBSCRIPTION_STEPS.THANKS });
            }
        } catch (error: any) {
            const { Code = 0 } = error.data || {};

            if (Code === API_CUSTOM_ERROR_CODES.PAYMENTS_SUBSCRIPTION_AMOUNT_MISMATCH) {
                await check(); // eslint-disable-line @typescript-eslint/no-use-before-define
                // translator: this message pops in a notification, in case user is waiting really too long, or does the checkout in another tab, which makes this ones not valid/expiring
                createNotification({ text: c('Error').t`Checkout expired, please try again`, type: 'error' });
            }

            observeApiError(error, (status) =>
                metrics.payments_subscription_total.increment({
                    ...metricsProps,
                    status,
                })
            );

            setModel({ ...model, step: checkoutStep });
            throw error;
        }
    };

    const { card, setCard, cardErrors, handleCardSubmit, method, setMethod, parameters, canPay, paypal, paypalCredit } =
        usePayment({
            api,
            amount:
                model.step === SUBSCRIPTION_STEPS.CHECKOUT ||
                model.step === SUBSCRIPTION_STEPS.CHECKOUT_WITH_CUSTOMIZATION
                    ? amountDue // Define amount only in the payment step to generate payment tokens
                    : 0,
            currency: checkResult?.Currency || DEFAULT_CURRENCY,
            onPaypalPay(params) {
                return withLoading(handleSubscribe(params));
            },
        });
    const creditCardTopRef = useRef<HTMLDivElement>(null);
    const bitcoinLoading = method === PAYMENT_METHOD_TYPES.BITCOIN && !bitcoinValidated && awaitingBitcoinPayment;

    const check = async (newModel: Model = model, wantToApplyNewGiftCode: boolean = false): Promise<boolean> => {
        const copyNewModel = {
            ...newModel,
            initialCheckComplete: true,
        };

        if (copyNewModel.step === SUBSCRIPTION_STEPS.CUSTOMIZATION && !supportAddons(copyNewModel.planIDs)) {
            copyNewModel.step = SUBSCRIPTION_STEPS.CHECKOUT;
        }

        if (!hasPlanIDs(newModel.planIDs)) {
            setCheckResult(getFreeCheckResult(model.currency, model.cycle));
            setModel(copyNewModel);
            return true;
        }

        try {
            abortControllerRef.current?.abort();
            abortControllerRef.current = new AbortController();

            const result = await api<SubscriptionCheckResponse>({
                ...checkSubscription({
                    Plans: newModel.planIDs,
                    Currency: newModel.currency,
                    Cycle: newModel.cycle,
                    Codes: getCodes(newModel),
                }),
                signal: abortControllerRef.current.signal,
            });

            const { Gift = 0 } = result;
            const { Code = '' } = result.Coupon || {}; // Coupon can equal null

            if (wantToApplyNewGiftCode && newModel.gift?.toLowerCase() !== Code.toLowerCase() && !Gift) {
                createNotification({ text: c('Error').t`Invalid code`, type: 'error' });
                giftCodeRef.current?.focus();
            }

            if (Code) {
                latestValidCouponCodeRef.current = Code;
            }
            copyNewModel.coupon = Code || subscriptionCouponCode || latestValidCouponCodeRef.current;

            if (!Gift) {
                delete copyNewModel.gift;
            }

            setCheckResult(result);
            setModel(copyNewModel);
        } catch (error: any) {
            if (error.name === 'OfflineError') {
                setModel({ ...model, step: SUBSCRIPTION_STEPS.NETWORK_ERROR });
            }

            return false;
        }

        return true;
    };

    const handleCheckout = async () => {
        try {
            if (!parameters) {
                return;
            }

            const amountAndCurrency: AmountAndCurrency = { Amount: amountDue, Currency: model.currency };

            let params: TokenPaymentMethod | WrappedCardPayment | ExistingPayment = parameters;
            if (amountAndCurrency.Amount !== 0) {
                params = await createPaymentToken(parameters, { amountAndCurrency });
            }

            return await handleSubscribe({ ...params, ...amountAndCurrency });
        } catch (e) {
            const error = getSentryError(e);
            if (error) {
                const context = { app, step, cycle, currency, coupon, planIDs, defaultAudience };
                captureMessage('Could not handle checkout', { level: 'error', extra: { error, context } });
            }
        }
    };

    const handleGift = (gift = '') => {
        if (loadingCheck) {
            return;
        }
        if (!gift) {
            const withoutGift = { ...model };
            delete withoutGift.gift;
            return withLoadingGift(check(withoutGift));
        }
        void withLoadingGift(check({ ...model, gift }, true));
    };

    const handleChangeCurrency = (currency: Currency) => {
        if (loadingCheck || currency === model.currency) {
            return;
        }
        void withLoadingCheck(check({ ...model, currency }));
    };

    const handleChangeCycle = (cycle: Cycle) => {
        if (loadingCheck || cycle === model.cycle) {
            return;
        }
        const checkPromise = check({ ...model, cycle });
        void withLoadingCheck(checkPromise);
        void withBlockAccountSizeSelector(checkPromise);
    };

    useEffect(() => {
        if (!model.initialCheckComplete) {
            return;
        }

        void metrics.payments_subscription_steps_total.increment(metricsProps);
    }, [model.step, model.initialCheckComplete]);

    useEffect(() => {
        // Trigger once to initialise the check values
        void withLoadingCheck(check());
    }, []);

    const backStep =
        model.step === SUBSCRIPTION_STEPS.CHECKOUT && !supportAddons(model.planIDs)
            ? SUBSCRIPTION_STEPS.PLAN_SELECTION
            : BACK[model.step];
    const isFreePlanSelected = !hasPlanIDs(model.planIDs);
    const isFreeUserWithFreePlanSelected = user.isFree && isFreePlanSelected;

    const disableCycleSelector = isFreePlanSelected || maybeDisableCycleSelector || getIsCustomCycle(model.cycle);

    useEffect(() => {
        // Each time the user switch between steps, it takes the user to the top of the modal
        topRef.current?.scrollIntoView?.();
    }, [model.step]);

    const handleCustomizationSubmit = () => {
        const run = async () => {
            let isSuccess = await check();

            if (isSuccess) {
                setModel((old) => ({
                    ...old,
                    step: SUBSCRIPTION_STEPS.CHECKOUT,
                }));
            }
        };
        void withLoading(run());
    };

    const handleUpsellVPNPassBundle = () => {
        if (loadingCheck) {
            return;
        }

        let newModel: Model;
        if (model.planIDs[PLANS.VPN]) {
            const cycleChange = ![CYCLE.FIFTEEN, CYCLE.THIRTY].includes(model.cycle)
                ? { cycle: CYCLE.FIFTEEN }
                : undefined;
            newModel = {
                ...model,
                ...cycleChange,
                planIDs: {
                    [PLANS.VPN_PASS_BUNDLE]: 1,
                },
            };
        } else {
            newModel = {
                ...model,
                planIDs: {
                    [PLANS.VPN]: 1,
                },
            };
        }
        setModel(newModel);
        const checkPromise = check(newModel);
        void withLoadingCheck(checkPromise);
        void withBlockCycleSelector(checkPromise);
    };

    return (
        <>
            {cancelSubscriptionModals}
            <ModalTwo
                className={clsx([
                    subscriptionModalClassName,
                    [
                        SUBSCRIPTION_STEPS.PLAN_SELECTION,
                        SUBSCRIPTION_STEPS.CUSTOMIZATION,
                        SUBSCRIPTION_STEPS.CHECKOUT,
                        SUBSCRIPTION_STEPS.CHECKOUT_WITH_CUSTOMIZATION,
                    ].includes(model.step) && 'subscription-modal--fixed-height',
                    [SUBSCRIPTION_STEPS.PLAN_SELECTION].includes(model.step) && 'subscription-modal--large-width',
                    [
                        SUBSCRIPTION_STEPS.CUSTOMIZATION,
                        SUBSCRIPTION_STEPS.CHECKOUT,
                        SUBSCRIPTION_STEPS.CHECKOUT_WITH_CUSTOMIZATION,
                    ].includes(model.step) && 'subscription-modal--medium-width',
                ])}
                onSubmit={(e: FormEvent) => {
                    e.preventDefault();

                    if (model.step === SUBSCRIPTION_STEPS.CUSTOMIZATION) {
                        return;
                    }

                    if (loadingCheck || loadingGift) {
                        return;
                    }
                    if (!handleCardSubmit()) {
                        creditCardTopRef.current?.scrollIntoView();
                        return;
                    }
                    void withLoading(handleCheckout());
                }}
                onClose={onClose}
                data-testid="plansModal"
                {...rest}
                as="form"
                size="large"
                disableCloseOnEscape={disableCloseOnEscape}
            >
                <ModalTwoHeader title={TITLE[model.step]} hasClose={hasClose} />
                <ModalTwoContent>
                    <div ref={topRef} />
                    {model.step === SUBSCRIPTION_STEPS.NETWORK_ERROR && <GenericError />}
                    {model.step === SUBSCRIPTION_STEPS.PLAN_SELECTION && (
                        <PlanSelection
                            loading={loadingCheck}
                            plans={plans}
                            plansMap={plansMap}
                            vpnServers={vpnServers}
                            currency={model.currency}
                            cycle={model.cycle}
                            planIDs={model.planIDs}
                            mode="modal"
                            subscription={subscription}
                            onChangePlanIDs={(planIDs) =>
                                withLoadingCheck(
                                    check({
                                        ...model,
                                        planIDs,
                                        step:
                                            !!planIDs[PLANS.VPN_PRO] || !!planIDs[PLANS.VPN_BUSINESS]
                                                ? SUBSCRIPTION_STEPS.CHECKOUT_WITH_CUSTOMIZATION
                                                : SUBSCRIPTION_STEPS.CUSTOMIZATION,
                                    })
                                )
                            }
                            onChangeCycle={handleChangeCycle}
                            onChangeCurrency={handleChangeCurrency}
                            onChangeAudience={setAudience}
                            audience={audience}
                            selectedProductPlans={selectedProductPlans}
                            onChangeSelectedProductPlans={setSelectedProductPlans}
                            organization={organization}
                            calendarSharingEnabled={calendarSharingEnabled}
                        />
                    )}
                    {model.step === SUBSCRIPTION_STEPS.CUSTOMIZATION && (
                        <div className="subscriptionCheckout-top-container">
                            <div className="flex-item-fluid on-mobile-w100 pr-4 md:pr-0 lg:pr-6 pt-6">
                                <div className="max-w50e">
                                    <PlanCustomization
                                        loading={loadingCheck}
                                        currency={model.currency}
                                        cycle={model.cycle}
                                        plansMap={plansMap}
                                        planIDs={model.planIDs}
                                        organization={organization}
                                        onChangePlanIDs={(planIDs) => setModel({ ...model, planIDs })}
                                        currentSubscription={subscription}
                                        className="pb-7 mb-8"
                                    />
                                </div>
                            </div>
                            <div className="subscriptionCheckout-column bg-weak on-mobile-w100 rounded">
                                <div
                                    className="subscriptionCheckout-container sticky-top"
                                    data-testid="subscription-checkout"
                                >
                                    <SubscriptionCheckout
                                        submit={
                                            <Button
                                                color="norm"
                                                loading={loading}
                                                onClick={handleCustomizationSubmit}
                                                fullWidth
                                                data-testid="continue-to-review"
                                            >
                                                {c('new_plans: action').t`Continue to review`}
                                            </Button>
                                        }
                                        checkResult={getOptimisticCheckResult({
                                            cycle: model.cycle,
                                            planIDs: model.planIDs,
                                            plansMap,
                                        })}
                                        plansMap={plansMap}
                                        vpnServers={vpnServers}
                                        isOptimistic={true}
                                        loading={loadingCheck}
                                        currency={model.currency}
                                        cycle={model.cycle}
                                        planIDs={model.planIDs}
                                        subscription={subscription}
                                        onChangeCurrency={handleChangeCurrency}
                                        {...checkoutModifiers}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    {model.step === SUBSCRIPTION_STEPS.CHECKOUT && (
                        <>
                            {showUserInfo && <UserInfo app={app} className="mb-4 mt-2" />}

                            <div className="subscriptionCheckout-top-container">
                                <div className="flex-item-fluid on-mobile-w100 pr-4 md:pr-0 lg:pr-6 pt-6">
                                    <div className="mx-auto max-w37e subscriptionCheckout-options ">
                                        {(() => {
                                            if (isFreePlanSelected) {
                                                return null;
                                            }
                                            if (disableCycleSelector) {
                                                return (
                                                    <>
                                                        <h2 className="text-2xl text-bold mb-4">
                                                            {c('Label').t`New plan`}
                                                        </h2>
                                                        <div className="mb-8">
                                                            {(() => {
                                                                const plan = getPlanFromCheckout(
                                                                    model.planIDs,
                                                                    plansMap
                                                                );
                                                                const result = getCheckout({
                                                                    planIDs: model.planIDs,
                                                                    plansMap,
                                                                    checkResult,
                                                                });
                                                                return (
                                                                    <SubscriptionItemView
                                                                        title={plan?.Title}
                                                                        bottomLeft={getShortBillingText(model.cycle)}
                                                                        topRight={getSimplePriceString(
                                                                            model.currency,
                                                                            result.withDiscountPerMonth,
                                                                            getMonthlySuffix(model.planIDs)
                                                                        )}
                                                                        bottomRight={getDiscountPrice(
                                                                            result.discountPerCycle,
                                                                            model.currency
                                                                        )}
                                                                        loading={loadingCheck}
                                                                    />
                                                                );
                                                            })()}
                                                            {canUpsellToVPNPassBundle(
                                                                model.planIDs,
                                                                model.cycle,
                                                                couponCode
                                                            ) && (
                                                                <VPNPassPromotionButton
                                                                    onClick={handleUpsellVPNPassBundle}
                                                                    currency={model.currency}
                                                                    cycle={model.cycle}
                                                                />
                                                            )}
                                                            {model.planIDs[PLANS.VPN_PASS_BUNDLE] && (
                                                                <Button
                                                                    className="flex flex-nowrap flex-align-items-center flex-justify-center"
                                                                    fullWidth
                                                                    color="weak"
                                                                    shape="outline"
                                                                    onClick={handleUpsellVPNPassBundle}
                                                                >
                                                                    <Icon name="trash" size={14} />
                                                                    <span className="ml-2">
                                                                        {c('bf2023: Action').t`Remove ${PASS_APP_NAME}`}
                                                                    </span>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </>
                                                );
                                            }
                                            return (
                                                <>
                                                    <h2 className="text-2xl text-bold mb-4">
                                                        {c('Label').t`Subscription options`}
                                                    </h2>
                                                    <div className="mb-8">
                                                        <SubscriptionCycleSelector
                                                            mode="buttons"
                                                            plansMap={plansMap}
                                                            planIDs={model.planIDs}
                                                            cycle={model.cycle}
                                                            currency={model.currency}
                                                            onChangeCycle={handleChangeCycle}
                                                            disabled={loadingCheck}
                                                        />
                                                    </div>
                                                </>
                                            );
                                        })()}
                                        {/* avoid mounting/unmounting the component which re-triggers the hook */}
                                        <div className={amountDue ? undefined : 'hidden'}>
                                            <Payment
                                                api={api}
                                                type="subscription"
                                                paypal={paypal}
                                                paypalCredit={paypalCredit}
                                                method={method}
                                                amount={amountDue}
                                                currency={checkResult?.Currency}
                                                coupon={couponCode}
                                                card={card}
                                                onMethod={setMethod}
                                                onCard={setCard}
                                                cardErrors={cardErrors}
                                                creditCardTopRef={creditCardTopRef}
                                                onBitcoinTokenValidated={async (data) => {
                                                    setBitcoinValidated(true);
                                                    await handleSubscribe({
                                                        ...data,
                                                        Amount: amountDue,
                                                        Currency: checkResult?.Currency as Currency,
                                                    });
                                                }}
                                                onAwaitingBitcoinPayment={setAwaitingBitcoinPayment}
                                            />
                                        </div>
                                        <div className={amountDue || !checkResult ? 'hidden' : undefined}>
                                            <h2 className="text-2xl text-bold mb-4">{c('Label').t`Payment details`}</h2>
                                            <div className="mb-4">{c('Info')
                                                .t`No payment is required at this time.`}</div>
                                            {checkResult?.Credit && creditsRemaining ? (
                                                <div className="mb-4">{c('Info')
                                                    .t`Please note that upon clicking the Confirm button, your account will have ${creditsRemaining} credits remaining.`}</div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                                <div className="subscriptionCheckout-column bg-weak on-mobile-w100 rounded">
                                    <div
                                        className="subscriptionCheckout-container sticky-top"
                                        data-testid="subscription-checkout"
                                    >
                                        <SubscriptionCheckout
                                            submit={
                                                <SubscriptionSubmitButton
                                                    currency={model.currency}
                                                    onClose={onClose}
                                                    paypal={paypal}
                                                    step={model.step}
                                                    loading={loading || bitcoinLoading}
                                                    method={method}
                                                    checkResult={checkResult}
                                                    className="w100"
                                                    disabled={isFreeUserWithFreePlanSelected || !canPay}
                                                />
                                            }
                                            plansMap={plansMap}
                                            checkResult={checkResult}
                                            vpnServers={vpnServers}
                                            loading={loadingCheck}
                                            currency={model.currency}
                                            subscription={subscription}
                                            cycle={model.cycle}
                                            planIDs={model.planIDs}
                                            gift={
                                                <>
                                                    {couponCode && (
                                                        <div className="flex flex-align-items-center mb-1">
                                                            <Icon name="gift" className="mr-2 mb-1" />
                                                            <Tooltip title={couponDescription}>
                                                                <code>{couponCode.toUpperCase()}</code>
                                                            </Tooltip>
                                                        </div>
                                                    )}
                                                    <PaymentGiftCode
                                                        giftCodeRef={giftCodeRef}
                                                        key={
                                                            /* Reset the toggle state when a coupon code gets applied */
                                                            couponCode
                                                        }
                                                        giftCode={model.gift}
                                                        onApply={handleGift}
                                                        loading={loadingGift}
                                                    />
                                                </>
                                            }
                                            onChangeCurrency={handleChangeCurrency}
                                            nextSubscriptionStart={subscription.PeriodEnd}
                                            {...checkoutModifiers}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    {model.step === SUBSCRIPTION_STEPS.CHECKOUT_WITH_CUSTOMIZATION && (
                        <div className="subscriptionCheckout-top-container">
                            <div className="flex-item-fluid on-mobile-w100 pr-4 md:pr-0 lg:pr-6 pt-6">
                                <h2 className="text-2xl text-bold mb-6">{c('Label').t`Organization size`}</h2>
                                <PlanCustomization
                                    loading={blockAccountSizeSelector}
                                    currency={model.currency}
                                    cycle={model.cycle}
                                    plansMap={plansMap}
                                    planIDs={model.planIDs}
                                    organization={organization}
                                    onChangePlanIDs={debounce((planIDs) => {
                                        const newModel = { ...model, planIDs };
                                        setModel(newModel);
                                        const checkPromise = check(newModel);
                                        void withLoadingCheck(checkPromise);
                                        void withBlockCycleSelector(checkPromise);
                                    }, 300)}
                                    forceHideDescriptions
                                    showUsersTooltip={false}
                                    currentSubscription={subscription}
                                    className="mb-8"
                                />
                                <div className="mx-auto max-w37e subscriptionCheckout-options">
                                    {!disableCycleSelector && (
                                        <>
                                            <h2 className="text-2xl text-bold mb-6">{c('Label')
                                                .t`Select your plan`}</h2>
                                            <div className="mb-8">
                                                <SubscriptionCycleSelector
                                                    mode="buttons"
                                                    plansMap={plansMap}
                                                    planIDs={model.planIDs}
                                                    cycle={model.cycle}
                                                    currency={model.currency}
                                                    onChangeCycle={handleChangeCycle}
                                                    disabled={loadingCheck}
                                                    faded={blockCycleSelector}
                                                />
                                            </div>
                                        </>
                                    )}
                                    <h2 className="text-2xl text-bold mb-4">{c('Label').t`Payment details`}</h2>
                                    {/* avoid mounting/unmounting the component which re-triggers the hook */}
                                    <div className={amountDue ? undefined : 'hidden'}>
                                        <Payment
                                            api={api}
                                            type="subscription"
                                            paypal={paypal}
                                            paypalCredit={paypalCredit}
                                            method={method}
                                            amount={amountDue}
                                            currency={checkResult?.Currency}
                                            coupon={couponCode}
                                            card={card}
                                            onMethod={setMethod}
                                            onCard={setCard}
                                            cardErrors={cardErrors}
                                            creditCardTopRef={creditCardTopRef}
                                            onBitcoinTokenValidated={async (data) => {
                                                setBitcoinValidated(true);
                                                await handleSubscribe({
                                                    ...data,
                                                    Amount: amountDue,
                                                    Currency: checkResult?.Currency as Currency,
                                                });
                                            }}
                                            onAwaitingBitcoinPayment={setAwaitingBitcoinPayment}
                                            hideFirstLabel={true}
                                        />
                                    </div>
                                    <div className={amountDue || !checkResult ? 'hidden' : undefined}>
                                        <div className="mb-4">{c('Info').t`No payment is required at this time.`}</div>
                                        {checkResult?.Credit && creditsRemaining ? (
                                            <div className="mb-4">{c('Info')
                                                .t`Please note that upon clicking the Confirm button, your account will have ${creditsRemaining} credits remaining.`}</div>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                            <div className="subscriptionCheckout-column bg-weak on-mobile-w100 rounded">
                                <div
                                    className="subscriptionCheckout-container sticky-top"
                                    data-testid="subscription-checkout"
                                >
                                    <SubscriptionCheckout
                                        submit={
                                            <SubscriptionSubmitButton
                                                currency={model.currency}
                                                onClose={onClose}
                                                paypal={paypal}
                                                step={model.step}
                                                loading={loading || bitcoinLoading}
                                                method={method}
                                                checkResult={checkResult}
                                                className="w100"
                                                disabled={isFreeUserWithFreePlanSelected || !canPay}
                                            />
                                        }
                                        subscription={subscription}
                                        plansMap={plansMap}
                                        checkResult={checkResult}
                                        vpnServers={vpnServers}
                                        loading={loadingCheck}
                                        currency={model.currency}
                                        cycle={model.cycle}
                                        planIDs={model.planIDs}
                                        gift={
                                            <>
                                                {couponCode && (
                                                    <div className="flex flex-align-items-center mb-1">
                                                        <Icon name="gift" className="mr-2 mb-1" />
                                                        <Tooltip title={couponDescription}>
                                                            <code>{couponCode.toUpperCase()}</code>
                                                        </Tooltip>
                                                    </div>
                                                )}
                                                <PaymentGiftCode
                                                    giftCodeRef={giftCodeRef}
                                                    key={
                                                        /* Reset the toggle state when a coupon code gets applied */
                                                        couponCode
                                                    }
                                                    giftCode={model.gift}
                                                    onApply={handleGift}
                                                    loading={loadingGift}
                                                />
                                            </>
                                        }
                                        onChangeCurrency={handleChangeCurrency}
                                        nextSubscriptionStart={subscription.PeriodEnd}
                                        showDiscount={false}
                                        enableDetailedAddons={true}
                                        showPlanDescription={false}
                                        {...checkoutModifiers}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    {model.step === SUBSCRIPTION_STEPS.UPGRADE && (
                        <SubscriptionThanks showDownloads={!isVpnB2bPlan} loading={true} method={method} />
                    )}
                    {model.step === SUBSCRIPTION_STEPS.THANKS && (
                        <SubscriptionThanks
                            showDownloads={!isVpnB2bPlan}
                            method={method}
                            onClose={() => {
                                onSuccess?.();
                                onClose?.();
                            }}
                        />
                    )}
                </ModalTwoContent>
                {(disablePlanSelection && backStep === SUBSCRIPTION_STEPS.PLAN_SELECTION) ||
                backStep === undefined ? null : (
                    <ModalTwoFooter>
                        <Button
                            onClick={() => {
                                setModel({ ...model, step: backStep });
                            }}
                        >{c('Action').t`Back`}</Button>
                    </ModalTwoFooter>
                )}
            </ModalTwo>
        </>
    );
};

export default SubscriptionModal;
