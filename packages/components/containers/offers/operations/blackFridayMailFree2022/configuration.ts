import { c } from 'ttag';

import { FeatureCode } from '@proton/components/containers/features';
import { COUPON_CODES, CYCLE, PLANS } from '@proton/shared/lib/constants';

import { getMailPlusInboxFeatures, getUnlimitedFeatures } from '../../helpers/offerCopies';
import { OfferConfig } from '../../interface';
import Layout from './Layout';
import bannerImage from './bf-mail-40-landscape.jpg';
import bannerImage2x from './bf-mail-40-landscape@2x.jpg';

const config: OfferConfig = {
    ID: 'black-friday-mail-free-2022',
    autoPopUp: 'one-time',
    featureCode: FeatureCode.OfferBlackFridayMailFree2022,
    images: {
        bannerImage,
        bannerImage2x,
    },
    deals: [
        {
            ref: 'bf_22_mail_free-modal-m1',
            planName: PLANS.MAIL,
            planIDs: {
                [PLANS.MAIL]: 1,
            },
            cycle: CYCLE.YEARLY,
            couponCode: COUPON_CODES.MAIL_BLACK_FRIDAY_2022,
            features: getMailPlusInboxFeatures,
            star: '1',
        },
        {
            ref: 'bf_22_mail_free-modal-u2',
            planName: PLANS.BUNDLE,
            planIDs: {
                [PLANS.BUNDLE]: 1,
            },
            cycle: CYCLE.TWO_YEARS,
            couponCode: COUPON_CODES.MAIL_BLACK_FRIDAY_2022,
            popular: 1,
            header: () => c('specialoffer: Label').t`Most popular`,
            features: getUnlimitedFeatures,
            star: '2',
        },
        {
            ref: 'bf_22_mail_free-modal-u1',
            planName: PLANS.BUNDLE,
            planIDs: {
                [PLANS.BUNDLE]: 1,
            },
            cycle: CYCLE.YEARLY,
            couponCode: COUPON_CODES.MAIL_BLACK_FRIDAY_2022,
            features: getUnlimitedFeatures,
            star: '3',
        },
    ],
    layout: Layout,
};

export default config;
