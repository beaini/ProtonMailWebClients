import { fork, put, select, take, takeEvery } from 'redux-saga/effects';

import { filterDeletedTabIds } from '@proton/pass/lib/extension/utils/tabs';
import {
    boot,
    bootSuccess,
    getUserAccessIntent,
    getUserFeaturesIntent,
    stateSync,
    wakeup,
    wakeupSuccess,
} from '@proton/pass/store/actions';
import { popupTabStateGarbageCollect } from '@proton/pass/store/actions/creators/popup';
import { passwordHistoryGarbageCollect } from '@proton/pass/store/actions/creators/pw-history';
import { userAccessRequest, userFeaturesRequest } from '@proton/pass/store/actions/requests';
import type { WithReceiverAction } from '@proton/pass/store/actions/with-receiver';
import { withRevalidate } from '@proton/pass/store/actions/with-request';
import { selectPopupStateTabIds } from '@proton/pass/store/selectors';
import type { State, WorkerRootSagaOptions } from '@proton/pass/store/types';
import type { TabId } from '@proton/pass/types';
import { WorkerStatus } from '@proton/pass/types';
import identity from '@proton/utils/identity';

function* wakeupWorker(
    { getAuth }: WorkerRootSagaOptions,
    { payload: { status }, meta }: WithReceiverAction<ReturnType<typeof wakeup>>
) {
    const { tabId, endpoint } = meta.receiver;
    const loggedIn = getAuth().hasSession();
    const userId = getAuth().getUserID();

    switch (status) {
        case WorkerStatus.IDLE:
        case WorkerStatus.ERROR: {
            if (loggedIn) {
                yield put(boot({}));
                yield take(bootSuccess.match);
            }
            break;
        }
        case WorkerStatus.BOOTING:
        case WorkerStatus.RESUMING: {
            yield take(bootSuccess.match);
            break;
        }
        default: {
            break;
        }
    }

    /* synchronise the consumer app */
    yield put(stateSync((yield select()) as State, { endpoint, tabId }));

    if (userId) {
        const maybeRevalidate = endpoint === 'popup' ? withRevalidate : identity;
        yield put(maybeRevalidate(getUserAccessIntent(userAccessRequest(userId))));
        yield put(getUserFeaturesIntent(userFeaturesRequest(userId)));
    }

    /* garbage collect any stale popup tab
     * state on each popup wakeup call */
    if (endpoint === 'popup') {
        yield put(passwordHistoryGarbageCollect());

        yield fork(function* () {
            const tabIds: TabId[] = yield select(selectPopupStateTabIds);
            const deletedTabIds: TabId[] = yield filterDeletedTabIds(tabIds);
            yield put(popupTabStateGarbageCollect({ tabIds: deletedTabIds }));
        });
    }

    yield put(wakeupSuccess(endpoint!, tabId!));
}

export default function* watcher(options: WorkerRootSagaOptions): Generator {
    yield takeEvery(wakeup.match, wakeupWorker, options);
}
