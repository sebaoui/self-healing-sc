'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { updateTitleSelector } from '../app/actions';

export type TitleSelector = 'h2' | 'h3';

interface SettingsContextType {
  titleSelector: TitleSelector;
  updateSelector: (selector: TitleSelector) => Promise<void>;
}

const defaultValue: SettingsContextType = {
  titleSelector: 'h2',
  updateSelector: async () => {},
};

export const SettingsContext = createContext<SettingsContextType>(defaultValue);

export function SettingsProvider({ children, initialSelector = 'h2' }: { children: ReactNode, initialSelector?: TitleSelector }) {
  const [titleSelector, setTitleSelectorInternal] = useState<TitleSelector>(initialSelector);

  const updateSelector = async (selector: TitleSelector) => {
    setTitleSelectorInternal(selector);
    await updateTitleSelector(selector);
  };

  return (
    <SettingsContext.Provider value={{ titleSelector, updateSelector }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
