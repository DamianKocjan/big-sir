import { useMachine } from '@xstate/react';
import { createContext, FC, useContext } from 'react';
import { Interpreter } from 'xstate';
import terminalMachine, { Context, TerminalEvent } from './terminal.machine';

type TerminalContextValue = Interpreter<
  Context,
  any,
  TerminalEvent,
  {
    value: any;
    context: Context;
  }
>;

export const TerminalContext = createContext<TerminalContextValue>(
  {} as Interpreter<
    Context,
    any,
    TerminalEvent,
    {
      value: any;
      context: Context;
    }
  >
);

const useTerminalContext = () => {
  const context = useContext(TerminalContext);
  if (context === undefined) {
    throw new Error('useSpotifyContext must be used within a SpotifyProvider');
  }
  return context;
};

const TerminalProvider: FC = ({ children }) => {
  const [, , service] = useMachine(terminalMachine);

  return (
    <TerminalContext.Provider value={service}>
      {children}
    </TerminalContext.Provider>
  );
};

export { TerminalProvider, useTerminalContext };
