import React, { useMemo } from 'react';
import { c } from 'ttag';

import { classnames, Icon } from '../../..';

import { Folder } from 'proton-shared/lib/interfaces/Folder';
import { Label } from 'proton-shared/lib/interfaces/Label';
import { SimpleFilterModalModel } from 'proton-shared/lib/filters/interfaces';
import { toMap } from 'proton-shared/lib/helpers/object';

import { DEFAULT_FOLDERS } from './FilterActionsFormFolderRow';

interface Props {
    labels: Label[];
    folders: Folder[];
    isNarrow: boolean;
    model: SimpleFilterModalModel;
    toggleOpen: () => void;
    isOpen: boolean;
}

const LABELS_ACTION = {
    labelAs: c('Action').t`label emails as`,
    moveTo: c('Action').t`move emails to`,
    markAs: c('Action').t`mark emails as`,
    autoReply: c('Action').t`send auto-reply email`
};

const FilterPreviewActions = ({ isOpen, isNarrow, toggleOpen, labels, folders, model }: Props) => {
    const { actions } = model;
    const labelsMap = toMap(labels, 'Name');

    const actionsRenderer = useMemo(() => {
        const actionsRows = [];

        if (actions.labelAs.labels.length) {
            const labelsTitles = actions.labelAs.labels.map((l, i) => {
                return i > 0 ? c('Label').t` and ${l}` : l;
            });
            const labelsElements = actions.labelAs.labels.map((l, i) => (
                <React.Fragment key={l}>
                    {i > 0 && c('Label').t` and `}
                    {isOpen ? (
                        <span
                            className="ml0-5 mr0-5 mb0-5 badgeLabel flex flex-row flex-items-center ellipsis"
                            role="listitem"
                            style={{
                                color: labelsMap[l].Color
                            }}
                        >
                            <span className="pm-badgeLabel-link color-white ellipsis nodecoration" title={l}>
                                {l}
                            </span>
                        </span>
                    ) : (
                        <strong>{l}</strong>
                    )}
                </React.Fragment>
            ));

            actionsRows.push({
                element: (
                    <span className="pm-badgeLabel-container">
                        {LABELS_ACTION.labelAs}
                        {` `}
                        {labelsElements}
                    </span>
                ),
                title: `${LABELS_ACTION.labelAs} ${labelsTitles}`
            });
        }

        if (actions.moveTo.folder) {
            const isDefault = ['archive', 'inbox', 'spam', 'trash'].includes(actions.moveTo.folder);
            const selectedFolder = isDefault
                ? DEFAULT_FOLDERS.find((f) => f.value === actions.moveTo.folder)?.text
                : folders.find((f) => f.Path === actions.moveTo.folder)?.Name;

            const folderElement = isOpen ? (
                <span className="inline-flex flex-row flex-items-center condition-token mb0-5" role="listitem">
                    <span className="ellipsis nodecoration" title={selectedFolder}>
                        {selectedFolder}
                    </span>
                </span>
            ) : (
                <strong>{selectedFolder}</strong>
            );

            actionsRows.push({
                element: (
                    <>
                        {LABELS_ACTION.moveTo}
                        {` `}
                        {folderElement}
                    </>
                ),
                title: `${LABELS_ACTION.moveTo} ${selectedFolder}`
            });
        }

        if (actions.markAs.read || actions.markAs.starred) {
            const readElement = isOpen ? (
                <span className="inline-flex flex-row flex-items-center condition-token mb0-5" role="listitem">
                    <span className="ellipsis nodecoration">{c('Filter preview').t`read`}</span>
                </span>
            ) : (
                <strong>{c('Filter preview').t`read`}</strong>
            );
            const starredElement = isOpen ? (
                <span className="inline-flex flex-row flex-items-center condition-token mb0-5" role="listitem">
                    <span className="ellipsis nodecoration">{c('Filter preview').t`starred`}</span>
                </span>
            ) : (
                <strong>{c('Filter preview').t`starred`}</strong>
            );

            const markAsTitle = `${actions.markAs.read && c('Filter preview').t`read`}${actions.markAs.read &&
                actions.markAs.starred &&
                ` ${c('Label').t`and`} `}${actions.markAs.starred && c('Filter preview').t`starred`}`;

            actionsRows.push({
                element: (
                    <>
                        {LABELS_ACTION.markAs}
                        {` `}
                        {actions.markAs.read && readElement}
                        {actions.markAs.read && actions.markAs.starred && (
                            <>
                                {` `}
                                {c('Label').t`and`}
                                {` `}
                            </>
                        )}
                        {actions.markAs.starred && starredElement}
                    </>
                ),
                title: `${LABELS_ACTION.markAs} ${markAsTitle}`
            });
        }

        if (actions.autoReply) {
            const label = isOpen ? (
                <span className="inline-flex flex-row flex-items-center condition-token mb0-5" role="listitem">
                    <span className="nodecoration" style={{ maxWidth: 'inherit' }}>
                        {LABELS_ACTION.autoReply}
                    </span>
                </span>
            ) : (
                <strong>{LABELS_ACTION.autoReply}</strong>
            );

            actionsRows.push({
                element: label,
                title: LABELS_ACTION.autoReply
            });
        }

        const title: string = actionsRows.reduce((acc, action, i) => {
            acc += i === 0 ? c('Label').t`Then` : ` ${c('Label').t`and`}`;
            return `${acc} ${action.title}`;
        }, '');

        return isOpen ? (
            <div className="pt0-5">
                {actionsRows.map((action, i) => (
                    <div key={`preview-action-${i}`}>
                        {i === 0 ? c('Label').t`Then` : c('Label').t`And`}
                        {` `}
                        {action.element}
                    </div>
                ))}
            </div>
        ) : (
            <div className="pt0-5 mw100 ellipsis" title={title}>
                {actionsRows.map((action, i) => (
                    <span key={`preview-action-${i}`}>
                        {i === 0 ? c('Label').t`Then` : ` ${c('Label').t`and`}`}
                        {` `}
                        {action.element}
                    </span>
                ))}
            </div>
        );
    }, [isOpen]);

    return (
        <div className="border-bottom mb2">
            <div className="flex flex-nowrap onmobile-flex-column align-items-center pt1 pb1">
                <button type="button" className={classnames(['w20 alignleft', isNarrow && 'mb1'])} onClick={toggleOpen}>
                    <Icon name="caret" className={classnames([isOpen && 'rotateX-180'])} />
                    <span className="ml0-5">{c('Label').t`Actions`}</span>
                </button>
                <div className={classnames(['flex flex-column flex-item-fluid', !isNarrow && 'ml1'])}>
                    {actionsRenderer}
                </div>
            </div>
        </div>
    );
};

export default FilterPreviewActions;
