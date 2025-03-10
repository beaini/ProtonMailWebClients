import type { AnyAction } from 'redux';
import type { Task } from 'redux-saga';
import { cancel, fork, select, take, takeLatest } from 'redux-saga/effects';

import { PassCrypto } from '@proton/pass/lib/crypto/pass-crypto';
import { CACHE_SALT_LENGTH, encryptData, getCacheEncryptionKey } from '@proton/pass/lib/crypto/utils';
import { workerReady } from '@proton/pass/lib/worker';
import { signout, stateLock } from '@proton/pass/store/actions';
import { isCacheTriggeringAction } from '@proton/pass/store/actions/with-cache-block';
import { asIfNotOptimistic } from '@proton/pass/store/optimistic/selectors/select-is-optimistic';
import { reducerMap } from '@proton/pass/store/reducers';
import type { State, WorkerRootSagaOptions } from '@proton/pass/store/types';
import { PassEncryptionTag } from '@proton/pass/types';
import { or } from '@proton/pass/utils/fp/predicates';
import { logger } from '@proton/pass/utils/logger';
import { objectFilter } from '@proton/pass/utils/object/filter';
import { stringToUint8Array, uint8ArrayToString } from '@proton/shared/lib/helpers/encoding';
import { wait } from '@proton/shared/lib/helpers/promise';

function* cacheWorker(action: AnyAction, { getWorkerState, getAuth, setCache }: WorkerRootSagaOptions) {
    yield wait(2_000);

    if (getAuth().hasSession() && workerReady(getWorkerState().status)) {
        try {
            const sessionLockToken = getAuth().getLockToken();
            const cacheSalt = crypto.getRandomValues(new Uint8Array(CACHE_SALT_LENGTH));
            const key: CryptoKey = yield getCacheEncryptionKey(cacheSalt, sessionLockToken);

            const state = (yield select()) as State;
            const whiteListedState = asIfNotOptimistic(state, reducerMap);

            /* keep non-expired request metadata */
            whiteListedState.request = objectFilter(
                whiteListedState.request,
                (_, request) => request.status === 'success' && request.expiresAt !== undefined
            );

            const encoder = new TextEncoder();
            const stringifiedState = JSON.stringify(whiteListedState);
            const encryptedData: Uint8Array = yield encryptData(
                key,
                encoder.encode(stringifiedState),
                PassEncryptionTag.Cache
            );

            const workerSnapshot = PassCrypto.serialize();
            const stringifiedSnapshot = JSON.stringify(workerSnapshot);

            const encryptedWorkerSnapshot: Uint8Array = yield encryptData(
                key,
                stringToUint8Array(stringifiedSnapshot),
                PassEncryptionTag.Cache
            );

            logger.info(`[Saga::Cache] Caching store and crypto state @ action["${action.type}"]`);
            yield setCache({
                salt: uint8ArrayToString(cacheSalt),
                state: uint8ArrayToString(encryptedData),
                snapshot: uint8ArrayToString(encryptedWorkerSnapshot),
            });
        } catch (_) {}
    }
}

export default function* watcher(options: WorkerRootSagaOptions) {
    yield takeLatest(isCacheTriggeringAction, function* (action: AnyAction) {
        const cacheTask: Task = yield fork(cacheWorker, action, options);

        yield take(or(stateLock.match, signout.match));
        logger.info(`[Saga::Cache] Invalidating all caching tasks`);
        yield cancel(cacheTask);
    });
}
