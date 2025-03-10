import { put, takeLeading } from 'redux-saga/effects';

import { deleteSessionLock } from '@proton/pass/lib/auth/session-lock';
import {
    sessionLockDisableFailure,
    sessionLockDisableIntent,
    sessionLockDisableSuccess,
} from '@proton/pass/store/actions';
import type { WithSenderAction } from '@proton/pass/store/actions/with-receiver';
import type { WorkerRootSagaOptions } from '@proton/pass/store/types';

function* disableSessionLockWorker(
    { onSessionLockChange }: WorkerRootSagaOptions,
    { meta, payload }: WithSenderAction<ReturnType<typeof sessionLockDisableIntent>>
) {
    try {
        yield deleteSessionLock(payload.pin);
        yield put(sessionLockDisableSuccess(meta.sender?.endpoint));
        yield onSessionLockChange?.();
    } catch (e) {
        yield put(sessionLockDisableFailure(e, meta.sender?.endpoint));
    }
}

export default function* watcher(options: WorkerRootSagaOptions) {
    yield takeLeading(sessionLockDisableIntent.match, disableSessionLockWorker, options);
}
