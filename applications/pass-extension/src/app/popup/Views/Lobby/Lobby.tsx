import { type VFC, useCallback, useEffect, useState } from 'react';

import { PromptForReload } from 'proton-pass-extension/lib/components/Extension/ExtensionError';
import { useNavigateToLogin } from 'proton-pass-extension/lib/hooks/useNavigateToLogin';
import { usePopupContext } from 'proton-pass-extension/lib/hooks/usePopupContext';
import { c } from 'ttag';

import { Button, CircleLoader } from '@proton/atoms';
import passBrandText from '@proton/pass/assets/protonpass-brand.svg';
import { FadeIn } from '@proton/pass/components/Layout/Animation/FadeIn';
import { LobbyLayout } from '@proton/pass/components/Layout/Lobby/LobbyLayout';
import { Unlock } from '@proton/pass/components/Lock/Unlock';
import { popupMessage, sendMessage } from '@proton/pass/lib/extension/message';
import { workerBusy, workerErrored, workerStale } from '@proton/pass/lib/worker';
import { type Maybe, WorkerMessageType, WorkerStatus } from '@proton/pass/types';
import { FORK_TYPE } from '@proton/shared/lib/authentication/ForkInterface';
import { BRAND_NAME, PASS_APP_NAME } from '@proton/shared/lib/constants';

const PROMPT_FOR_RELOAD_TIMEOUT = 10000;

const LobbyContent: VFC = () => {
    const { state, logout } = usePopupContext();
    const [promptForReload, setPromptForReload] = useState(false);
    const stale = workerStale(state.status);
    const busy = workerBusy(state.status);
    const locked = state.status === WorkerStatus.LOCKED;
    const canSignOut = workerErrored(state.status) || locked;

    const login = useNavigateToLogin({ autoClose: true });

    const handleSignInClick = useCallback(
        async () =>
            workerErrored(state.status)
                ? sendMessage(popupMessage({ type: WorkerMessageType.WORKER_INIT, payload: { sync: true } }))
                : login(),
        [state.status]
    );

    const handleSignUpClick = useCallback(async () => login(FORK_TYPE.SIGNUP), []);

    useEffect(() => {
        let timer: Maybe<NodeJS.Timeout> = stale
            ? setTimeout(() => setPromptForReload(true), PROMPT_FOR_RELOAD_TIMEOUT)
            : undefined;
        return () => clearTimeout(timer);
    }, [stale]);

    const brandNameJSX = (
        <img
            src={passBrandText}
            className="pass-lobby--brand-text ml-2 h-custom"
            style={{ '--h-custom': '1.5rem' }}
            key="brand"
            alt=""
        />
    );

    if (busy) {
        return promptForReload ? (
            <PromptForReload
                message={c('Warning')
                    .t`Something went wrong while starting ${PASS_APP_NAME}. Please try refreshing or reloading the extension`}
            />
        ) : (
            <FadeIn delay={250} className="mt-12 w-full" key="lobby-loading">
                <div className="flex flex-column flex-align-items-center gap-3">
                    <CircleLoader size="medium" />
                    <span className="block text-sm text-weak">
                        {(() => {
                            switch (state.status) {
                                case WorkerStatus.AUTHORIZED:
                                case WorkerStatus.AUTHORIZING:
                                case WorkerStatus.RESUMING:
                                    // translator: status message displayed when loading
                                    return c('Info').t`Signing you in`;
                                case WorkerStatus.BOOTING:
                                    return c('Info').t`Decrypting your data`;
                                default:
                                    return c('Info').t`Loading extension`;
                            }
                        })()}
                    </span>
                </div>
            </FadeIn>
        );
    }

    return (
        <FadeIn delay={250} key="lobby">
            <div className="flex flex-column flex-align-items-center gap-3">
                <span className="pass-lobby--heading text-bold text-norm flex flex-align-items-center flex-justify-center user-select-none">
                    {locked ? c('Title').jt`Unlock ${brandNameJSX}` : c('Title').jt`Welcome to ${brandNameJSX}`}
                </span>
                <span className="text-norm">
                    {locked ? c('Info').jt`Enter your PIN code` : c('Info').jt`Sign in to your account`}
                </span>
            </div>

            <div className="flex-item-fluid mt-8 flex flex-column gap-2">
                {!locked && (
                    <Button pill shape="solid" color="norm" className="w-full" onClick={handleSignInClick}>
                        {workerErrored(state.status)
                            ? c('Action').t`Sign back in`
                            : c('Action').t`Sign in with ${BRAND_NAME}`}
                    </Button>
                )}

                {!(locked || canSignOut) && (
                    <Button pill shape="solid" color="weak" className="w-full" onClick={handleSignUpClick}>
                        {c('Action').t`Create a ${BRAND_NAME} account`}
                    </Button>
                )}

                {locked && (
                    <div className="mb-8">
                        <Unlock />
                    </div>
                )}

                {canSignOut && (
                    <Button
                        pill
                        shape="outline"
                        color="danger"
                        className="w-full"
                        onClick={() => logout({ soft: true })}
                    >
                        {c('Action').t`Sign out`}
                    </Button>
                )}
            </div>
        </FadeIn>
    );
};

export const Lobby: VFC = () => (
    <LobbyLayout overlay>
        <LobbyContent />
    </LobbyLayout>
);
