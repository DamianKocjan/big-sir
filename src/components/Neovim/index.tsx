import { FC, useEffect, useState } from 'react';
import Loading from './Loading';
import Editor from './Editor';

type EditorState = 'loading' | 'nvim';
const Neovim: FC<{
  isTerminalFocused: boolean;
}> = ({ isTerminalFocused }) => {
  const [editorState, setEditorState] = useState<EditorState>('loading');

  // to lazy to use a machine here / not worth
  useEffect(() => {
    const timeout = setTimeout(() => {
      setEditorState('nvim');
    }, 2000);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  if (editorState === 'loading') {
    return <Loading />;
  }

  if (editorState === 'nvim') {
    return <Editor isTerminalFocused={isTerminalFocused} />;
  }

  return <></>;
};

export default Neovim;
