import { FC, useEffect, useRef, useState } from 'react';
import styled from 'styled-components/macro';
import { Controlled as CodeMirror } from 'react-codemirror2';
import ModeLine from './ModeLine';
import CommandLine from './CommandLine';
import useEditorState from '../../hooks/useEditorState';
import { useTerminalContext } from '../Terminal/TerminalContext';
import { useService } from '@xstate/react';
import { Context, TerminalEvent } from '../Terminal/terminal.machine';
require('codemirror/mode/htmlmixed/htmlmixed');
require('codemirror/keymap/vim');

const options = {
  theme: 'dracula',
  lineNumbers: true,
  keyMap: 'vim',
  mode: 'htmlmixed',
};

const Editor: FC<{
  isTerminalFocused: boolean;
  fileContent: string;
}> = ({ isTerminalFocused, fileContent }) => {
  const service = useTerminalContext();
  const [, send] = useService<Context, TerminalEvent>(service);
  const [state, dispatch] = useEditorState();
  const [code, setCode] = useState(fileContent);
  const ref = useRef<HTMLDivElement>(null);
  const commandTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const commandRef = useRef<string | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  });

  useEffect(() => {
    if (isTerminalFocused) {
      if (commandTextAreaRef.current) {
        commandTextAreaRef.current.focus();
      }
    }
  }, [isTerminalFocused]);

  useEffect(() => {
    const to = setTimeout(() => {
      if (ref.current) {
        const scrollHeight = ref.current.scrollHeight;
        ref.current.scrollTo(0, scrollHeight);
      }
    }, 3000);
    return () => {
      clearTimeout(to);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { key } = e;

      // command mode
      if (key === ':') {
        if (commandTextAreaRef.current) {
          commandTextAreaRef.current.focus();
        }
        dispatch({ type: 'modeChanged', payload: { mode: 'command' } });
      } else if (stateRef.current.mode === 'command') {
        if (key === 'Enter') {
          if (stateRef.current.command === ':q') {
            send({ type: 'CHANGE_MODE', payload: { mode: 'terminal' } });
          }
          commandRef.current = '';
          if (commandTextAreaRef.current) {
            commandTextAreaRef.current.value = '';
          }
          dispatch({ type: 'modeChanged', payload: { mode: 'normal' } });
        } else if (key === 'Escape') {
          commandRef.current = '';
          commandTextAreaRef.current!.value = '';
          dispatch({ type: 'modeChanged', payload: { mode: 'normal' } });
        } else if (key === 'Backspace') {
          const command = commandRef.current ?? '';
          const strippedLastLetter = command.split('');
          strippedLastLetter.pop();

          dispatch({
            type: 'addCommand',
            payload: { command: `${strippedLastLetter.join('')}` },
          });
        } else {
          dispatch({
            type: 'addCommand',
            payload: { command: `${commandRef.current}${key}` },
          });
        }
      }
    };

    const handleKeyUp = () => {};

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [dispatch, send]);

  return (
    <>
      <Wrapper ref={ref}>
        <FileContent>
          <CodeMirror
            options={options}
            value={code}
            onBeforeChange={(editor, data, value) => {
              setCode(value);
            }}
            onChange={(editor, data, value) => {
              setCode(value);
            }}
          />
        </FileContent>
        <ModeLine mode={state.mode} />
        <CommandLine command={state.command} />
        <HiddenTextArea
          ref={commandTextAreaRef}
          onChange={(e) => {
            if (state.mode === 'command') {
              commandRef.current = e.target.value;
            }
          }}
        />
      </Wrapper>
    </>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  color: white;
  height: 100%;
  background: #282a36;
`;
const FileContent = styled.div`
  height: calc(100% - 50px);
  .react-codemirror2,
  .react-codemirror2 > div {
    color: white !important;
    height: 100%;
  }
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

export default Editor;
