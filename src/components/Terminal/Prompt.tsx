import React, { FC, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components/macro';
import { Command, Context, TerminalEvent } from './terminal.machine';
import { useAppContext } from '../../AppContext';
import autocomplete from '../../utils/autocomplete';
import { getFileContents } from '../../utils';
import { useTerminalContext } from './TerminalContext';
import { useService } from '@xstate/react';

const Prompt: FC<{
  isTerminalFocused: boolean;
}> = ({ isTerminalFocused }) => {
  const service = useTerminalContext();
  const [state, send] = useService<Context, TerminalEvent>(service);

  const { send: sendParent } = useAppContext();
  const { currentCommand, keysCurrentlyPressed } = state.context;
  const stateRef = useRef(state.context);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const commandRef = useRef<string | null>(null);

  useEffect(() => {
    stateRef.current = state.context;
    if (
      state.history?.event?.type === 'INCREMENT_HISTORY' ||
      state.history?.event?.type === 'DECREMENT_HISTORY'
    ) {
      textAreaRef.current!.value = currentCommand;
      commandRef.current = currentCommand;
    }
  });

  useEffect(() => {
    if (isTerminalFocused) {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
      }
    }
  }, [isTerminalFocused]);

  const clearRefs = () => {
    textAreaRef.current!.value = '';
    commandRef.current = '';
  };
  const clear = useCallback(() => {
    clearRefs();
    send({ type: 'CLEAR' });
  }, [send]);

  useEffect(() => {
    if (
      keysCurrentlyPressed.includes('Meta') &&
      keysCurrentlyPressed.includes('k') &&
      textAreaRef.current &&
      textAreaRef.current.value === ''
    ) {
      clear();
    }
    if (
      keysCurrentlyPressed.includes('Control') &&
      keysCurrentlyPressed.includes('c')
    ) {
      const currentInput = textAreaRef.current!.value;
      const currentCommand = `${currentInput}^C`;

      const command: Command = {
        input: currentCommand,
        type: 'fake',
        output: '',
        cwd: stateRef.current.cwd,
      };

      clearRefs();
      send({ type: 'ADD_COMMAND', payload: { command } });
    }
  }, [keysCurrentlyPressed, clear, send]);

  useEffect(() => {
    const displayMessage = (
      currentCommand: string,
      cwd: string,
      message: string
    ) => {
      const command: Command = {
        input: currentCommand,
        type: 'fake',
        output: message,
        cwd,
      };

      textAreaRef.current!.value = '';
      commandRef.current = '';
      send({ type: 'ADD_COMMAND', payload: { command } });
    };
    if (isTerminalFocused) {
      const handleKeyDown = (e: KeyboardEvent) => {
        const { key } = e;
        let output = '';
        const currentCommand = commandRef.current ?? '';
        const [cmd, ...args] = currentCommand.split(' ');

        send({ type: 'KEY_DOWN', payload: { key } });

        if (key === 'Tab') {
          e.preventDefault();
          if (
            cmd === 'ls' ||
            cmd === 'cat' ||
            cmd === 'cd' ||
            cmd === 'nvim' ||
            cmd === 'open'
          ) {
            const results = autocomplete(args[0], stateRef.current.cwdContents);
            if (results.length > 1) {
              const output = results.join(' ');
              const command: Command = {
                input: commandRef.current!,
                type: 'real',
                output,
                cwd: stateRef.current.cwd,
              };
              send({ type: 'ADD_COMMAND', payload: { command } });
              clearRefs();
            } else {
              if (results[0]) {
                const term = args?.[0]?.split('/') ?? '';
                const parts = term.slice(0, term.length - 1);
                const path = [...parts, results[0]].filter(Boolean);
                const newCommand = `${cmd} ${
                  path.length > 1 ? path.join('/') : path
                }`;
                send({
                  type: 'SET_CURRENT_COMMAND',
                  payload: { command: newCommand },
                });
                commandRef.current = newCommand;
                if (textAreaRef.current) {
                  textAreaRef.current.value = newCommand;
                }
              }
            }
          }
        } else if (key === 'ArrowDown') {
          e.preventDefault();
          send({ type: 'INCREMENT_HISTORY' });
        } else if (key === 'ArrowUp') {
          e.preventDefault();
          send({ type: 'DECREMENT_HISTORY' });
        } else if (key === 'Enter') {
          e.preventDefault();
          if (textAreaRef.current) {
            textAreaRef.current.value = '';
          }

          if (cmd === 'cat') {
            displayMessage(
              currentCommand,
              stateRef.current.cwd,
              'Only nvim is supported to view files!'
            );
            return;
          } else if (cmd === 'pwd') {
            output = `${stateRef.current.cwd}`;
          } else if (cmd === 'nvim') {
            if (
              stateRef.current.cwdContents &&
              typeof stateRef.current.cwdContents !== 'string'
            ) {
              const term = args?.[0]?.split('/') ?? [];
              const parts = term.slice(0, term.length - 1);
              const last = term.slice(-1)[0];
              let nvimInput = '';

              if (term.length > 1) {
                nvimInput = getFileContents(
                  parts,
                  last,
                  stateRef.current.cwdContents
                ) as string;
              } else {
                if (
                  typeof stateRef.current.cwdContents?.[args[0]]?.contents ===
                  'string'
                ) {
                  nvimInput = stateRef.current.cwdContents?.[args[0]]
                    ?.contents as string;
                }
              }

              if (typeof nvimInput === 'string') {
                const command: Command = {
                  input: commandRef.current!,
                  type: 'real',
                  output,
                  cwd: stateRef.current.cwd,
                };
                send({
                  type: 'CHANGE_MODE',
                  payload: { mode: 'nvim', fileContent: nvimInput, command },
                });
                return;
              } else {
                displayMessage(
                  currentCommand,
                  stateRef.current.cwd,
                  'File Not Found'
                );
                return;
              }
            }
          } else if (cmd === 'cd') {
            const path = args[0];
            send({
              type: 'CHANGE_DIRECTORY',
              payload: { path },
            });
          } else if (cmd === 'ls') {
            output = Object.values(stateRef.current.cwdContents)
              .map((x) => x.display)
              .join(' ');
          } else if (cmd === 'open') {
            const term = args[0].split('/');
            const parts = term.slice(0, term.length - 1);
            const last = term.slice(-1)[0];
            let defaultUrl = '';

            if (term.length > 1) {
              defaultUrl = getFileContents(
                parts,
                last,
                stateRef.current.cwdContents
              ) as string;
            } else if (typeof stateRef.current.cwdContents !== 'string') {
              defaultUrl = stateRef.current.cwdContents?.[args[0]]
                ?.contents as string;
            }

            sendParent({
              type: 'FOCUS_WINDOW',
              payload: {
                name: 'chrome',
                defaultUrl,
              },
            });
          } else if (cmd !== '') {
            output = `bash: ${cmd}: command not found`;
          } else {
            const command: Command = {
              input: currentCommand,
              type: 'fake',
              output: '',
              cwd: stateRef.current.cwd,
            };

            clearRefs();
            send({ type: 'ADD_COMMAND', payload: { command } });
            return;
          }

          const command: Command = {
            input: commandRef.current!,
            type: 'real',
            output,
            cwd: stateRef.current.cwd,
          };
          send({ type: 'ADD_COMMAND', payload: { command } });
          commandRef.current = '';
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        const { key } = e;
        send({ type: 'KEY_UP', payload: { key } });
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [isTerminalFocused, send, sendParent]);

  return (
    <Wrapper>
      <HiddenTextArea
        ref={textAreaRef}
        onChange={(e) => {
          // for some reason a \n appears after exiting vim
          const command = e.target.value?.replace(/(\r\n|\n|\r)/gm, '');
          commandRef.current = command;
          if (textAreaRef.current) {
            textAreaRef.current.value = command;
          }
          send({
            type: 'SET_CURRENT_COMMAND',
            payload: { command },
          });
        }}
        onBlur={() => {
          if (isTerminalFocused && textAreaRef.current) {
            textAreaRef.current.focus();
          }
        }}
      />
      {state.context.commands.map((line, i) => {
        const { output, cwd } = line;
        return (
          <React.Fragment key={i}>
            <Line>
              <User>[{cwd}]$&nbsp;</User>
              <Input>{line.input}</Input>
            </Line>
            {output && <pre style={{ color: 'white' }}>{output}</pre>}
          </React.Fragment>
        );
      })}
      <Line>
        <User>[{state.context.cwd}]$&nbsp;</User>
        <Input>
          {currentCommand}
          {isTerminalFocused && (
            <CursorWrapper>
              <Cursor />
            </CursorWrapper>
          )}
        </Input>
      </Line>
    </Wrapper>
  );
};

const Wrapper = styled.div``;
const Line = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  line-height: 25px;
`;
const User = styled.div`
  color: limegreen;
`;
const Input = styled.pre`
  color: white;
  position: relative;
  bottom: 2px;
`;
const HiddenTextArea = styled.textarea`
  position: absolute;
  left: -16px;
  top: 0;
  width: 20px;
  height: 16px;
  background: transparent;
  border: none;
  color: transparent;
  outline: none;
  padding: 0;
  resize: none;
  z-index: 1;
  overflow: hidden;
  white-space: pre;
  text-indent: -9999em;
`;
const CursorWrapper = styled.div`
  display: inline-block;
  position: relative;
  margin-left: 2px;
`;
const Cursor = styled.div`
  position: absolute;
  top: -17px;
  left: 0;
  background: #b6b6b6;
  width: 12px;
  height: 22px;
`;

export default Prompt;
