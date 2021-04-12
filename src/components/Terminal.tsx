import {
  forwardRef,
  ForwardRefRenderFunction,
  useEffect,
  useRef,
  useState,
} from 'react';
import useMutationObserver from '@rooks/use-mutation-observer';
import styled from 'styled-components/macro';
import Neovim from '../components/Neovim';
import Window from '../components/Window';
import Prompt from '../components/Prompt';
import ActionBar from '../components/ActionBar';
import { RectResult } from '../hooks/useRect';
import { useAppContext } from '../AppContext';
import useIsFocused from '../hooks/useIsFocused';
import usePromptState from '../hooks/usePromptState';

export type View = 'terminal' | 'nvim';
const Terminal: ForwardRefRenderFunction<
  HTMLDivElement,
  {
    minimizedTargetRect: RectResult;
  }
> = ({ minimizedTargetRect }, ref) => {
  const prompState = usePromptState();
  const { state, dispatch } = useAppContext();
  const [view, setView] = useState<View>('terminal');
  const [fileContent, setFileContent] = useState('');
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const terminalState = state.activeWindows.find(
    (aw) => aw.name === 'terminal'
  );
  const isMinimized = !!state.minimizedWindows.find(
    (mw) => mw.name === 'terminal'
  );
  const consoleRef = useRef<HTMLDivElement | null>(null);
  const { isFocused: isTerminalFocused, setIsFocused } = useIsFocused(
    ref as any
  );

  useEffect(() => {
    if (isTerminalFocused) {
      dispatch({
        type: 'focusWindow',
        payload: { name: 'terminal', ref: ref as any },
      });
    }
  }, [isTerminalFocused]);

  useEffect(() => {
    if (view === 'terminal') {
      setIsFocused(true);
    } else {
      setIsFocused(false);
    }
  }, [view]);

  const callback = () => {
    if (consoleRef.current) {
      const scrollHeight = consoleRef.current.scrollHeight;
      consoleRef.current.scrollTo(0, scrollHeight);
    }
  };

  useMutationObserver(consoleRef, callback);

  const handleMinimizeClick = () => {
    dispatch({ type: 'minimizedWindow', payload: { name: 'terminal' } });
  };
  const handleCloseClick = () => {
    dispatch({ type: 'removeWindow', payload: { name: 'terminal' } });
  };
  const handleMaximizeClick = () => {
    if (window) {
      setDimensions({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    }
  };

  return (
    <Window
      height={dimensions.height}
      width={dimensions.width}
      minimizedTargetRect={minimizedTargetRect}
      isWindowMinimized={isMinimized}
      zIndex={terminalState?.zIndex}
    >
      <Wrapper isWindowMinimized={isMinimized} ref={ref}>
        <ActionBar
          handleMinimizeClick={handleMinimizeClick}
          handleCloseClick={handleCloseClick}
          handleMaximizeClick={handleMaximizeClick}
        />
        <Console ref={consoleRef}>
          {view === 'terminal' && (
            <div
              style={{
                height: '100%',
                width: '100%',
                padding: '3px',
                // visibility: view === 'terminal' ? 'visible' : 'hidden',
              }}
            >
              <LastLogin>Last login: Sun Mar 14 23:14:25 on ttys001</LastLogin>
              <Prompt
                isTerminalFocused={isTerminalFocused}
                setView={setView}
                setFileContent={setFileContent}
                promptState={prompState}
              ></Prompt>
            </div>
          )}
          {view === 'nvim' && (
            <>
              <Neovim
                fileContent={fileContent}
                setView={setView}
                isTerminalFocused={isTerminalFocused}
              />
            </>
          )}
        </Console>
      </Wrapper>
    </Window>
  );
};

const LastLogin = styled.div`
  color: white;
  margin-bottom: 7px;
`;
const Console = styled.div`
  font-family: 'Roboto Mono', monospace;
  height: calc(100% - 22px);
  width: 100%;
  background: #151516;
  flex: 1;
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  overflow: scroll;
`;
const Wrapper = styled.div<{
  isWindowMinimized: boolean;
}>`
  ${({ isWindowMinimized }) =>
    isWindowMinimized
      ? `transform: scale(0.2); opacity: 0;`
      : `transform: scale(1); opacity: 1;`}
  transition: transform .7s, opacity .4s;
  transform-origin: top left;
  width: 100%;
  height: 100%;
`;

export default forwardRef(Terminal);
