import { useCallback, useState } from 'react';
import type { XiamiTaskAction } from '../utils/xiamiUrl';

/** 一次虾蜜会话：动作类型 + 更新动作所属的任务批次 ID（新建动作为空） */
export interface XiamiTaskDrawerState {
    action: XiamiTaskAction;
    parentTaskId?: number;
}

/**
 * 虾蜜任务抽屉状态管理 Hook：以显式动作类型（非标题字符串）驱动 Drawer，
 * 用法：
 *   const xiami = useXiamiTaskDrawer();
 *   <Button onClick={() => xiami.open('create-task')}>新建任务</Button>
 *   <Button onClick={() => xiami.open('update-task-items', task.parentTaskId)}>修改任务项</Button>
 *   <XiamiTaskDrawer open={xiami.state != null} action={xiami.state?.action ?? null}
 *     parentTaskId={xiami.state?.parentTaskId} onClose={xiami.close} />
 */
export function useXiamiTaskDrawer() {
    const [state, setState] = useState<XiamiTaskDrawerState | null>(null);

    const open = useCallback(
        (action: XiamiTaskAction, parentTaskId?: number) => {
            setState({ action, parentTaskId });
        },
        [],
    );

    const close = useCallback(() => {
        setState(null);
    }, []);

    return { state, open, close };
}
