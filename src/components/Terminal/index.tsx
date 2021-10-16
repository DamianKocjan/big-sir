import { FC, useEffect, useRef, useState } from 'react';
import useMutationObserver from '@rooks/use-mutation-observer';
import { useService } from '@xstate/react';
import styled from 'styled-components/macro';
import Neovim from '../../components/Neovim';
import Prompt from './Prompt';
import useIsFocused from '../../hooks/useIsFocused';
import useLocalStorage from '../../hooks/useLocalStorage';
import { formatDate } from '../../utils';
import { Context, TerminalEvent } from './terminal.machine';
import { TerminalProvider, useTerminalContext } from './TerminalContext';

const TerminalWrapper = () => {
  return (
    <TerminalProvider>
      <Terminal />
    </TerminalProvider>
  );
};
const Terminal: FC = () => {
  const service = useTerminalContext();
  const [state] = useService<Context, TerminalEvent>(service);
  const { mode } = state.context;
  const [lastLogin, setLastLogin] = useLocalStorage(
    'lastLogin',
    formatDate(new Date())
  );
  const ref = useRef<HTMLDivElement | null>(null);
  const consoleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      setLastLogin(formatDate(new Date()));
    };
  }, [setLastLogin]);

  const callback = () => {
    if (consoleRef.current) {
      const scrollHeight = consoleRef.current.scrollHeight;
      consoleRef.current.scrollTo(0, scrollHeight);
    }
  };

  const { isFocused } = useIsFocused(ref);

  useMutationObserver(consoleRef, callback);

  return (
    <Wrapper ref={ref}>
      <TopBar className="action-bar" />
      {mode === 'terminal' && (
        <Console ref={consoleRef}>
          <div
            style={{
              height: '100%',
              width: '100%',
              padding: '3px',
            }}
          >
            <Message>{`Last login: ${lastLogin} on ttys001`}</Message>
            <Message>{`View resume at /home/personal/Resume.js (ex: nvim home/personal/Resume.js)`}</Message>
            <Prompt
              isTerminalFocused={isFocused}
            ></Prompt>
          </div>
        </Console>
      )}
      {mode === 'nvim' && (
        <Console>
          <Neovim isTerminalFocused={true} />
        </Console>
      )}
    </Wrapper>
  );
};

const TopBar = styled.div<{ theme: any }>`
  background: ${({ theme }) => theme.topBarBackground};
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  height: 30px;
  padding: 7px;
`;
const Message = styled.div`
  color: white;
  margin-bottom: 7px;
`;
const Console = styled.div`
  font-family: 'Roboto Mono', monospace;
  background: #151516;
  height: calc(100% - 30px);
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  overflow: auto;
`;
const Wrapper = styled.div`
  height: 100%;
`;

export default TerminalWrapper;
