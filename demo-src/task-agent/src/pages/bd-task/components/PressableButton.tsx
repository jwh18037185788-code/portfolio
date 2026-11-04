import React, { useState } from 'react';
import { MT_ANIM } from '../theme';

interface PressableButtonProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * 按钮点击缩放反馈包裹组件：鼠标按下时轻微缩放，提供点击反馈感。
 * 用法：<PressableButton><Button ...>文案</Button></PressableButton>
 */
const PressableButton: React.FC<PressableButtonProps> = ({ children, style }) => {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      style={{
        display: 'inline-block',
        transform: pressed ? MT_ANIM.pressScale : 'scale(1)',
        transition: MT_ANIM.transitionFast,
        ...style,
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
    >
      {children}
    </div>
  );
};

export default PressableButton;
