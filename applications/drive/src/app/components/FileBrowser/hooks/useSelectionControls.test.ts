import { act, renderHook } from '@testing-library/react-hooks';

import { useSelectionControls } from './useSelectionControls';

const ALL_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

describe('useSelection', () => {
    let hook: {
        current: ReturnType<typeof useSelectionControls>;
    };

    beforeEach(() => {
        const { result } = renderHook(() => useSelectionControls({ itemIds: ALL_IDS }));
        hook = result;
    });

    it('toggleSelectItem', () => {
        const itemIdToToggle = '1';
        act(() => {
            hook.current.toggleSelectItem(itemIdToToggle);
        });
        expect(hook.current.selectedItemIds).toMatchObject([itemIdToToggle]);
    });

    it('toggleAllSelected', () => {
        act(() => {
            hook.current.toggleAllSelected();
        });
        expect(hook.current.selectedItemIds).toMatchObject(ALL_IDS);
    });

    it('toggleRange', () => {
        act(() => {
            hook.current.selectItem('3');
        });
        act(() => {
            hook.current.toggleRange('5');
        });
        expect(hook.current.selectedItemIds).toMatchObject(['3', '4', '5']);
    });

    it('selectItem', () => {
        act(() => {
            hook.current.selectItem('1');
        });
        act(() => {
            hook.current.selectItem('3');
        });
        expect(hook.current.selectedItemIds).toMatchObject(['3']);
    });

    it('clearSelection', () => {
        act(() => {
            hook.current.toggleAllSelected();
        });
        act(() => {
            hook.current.clearSelections();
        });
        expect(hook.current.selectedItemIds).toMatchObject([]);
    });
});
