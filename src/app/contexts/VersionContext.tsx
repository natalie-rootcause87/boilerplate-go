'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export const CURRENT_VERSION = "v0.2.2";

interface VersionContextType {
  version: string;
  updateVersion: (newVersion: string) => void;
  showVersionModal: boolean;
  setShowVersionModal: (show: boolean) => void;
}

const VersionContext = createContext<VersionContextType | undefined>(undefined);

export function VersionProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(CURRENT_VERSION);
  const [showVersionModal, setShowVersionModal] = useState(false);

  useEffect(() => {
    const lastVersion = localStorage.getItem('gameVersion');
    if (!lastVersion || lastVersion !== version) {
      setShowVersionModal(true);
    }
  }, [version]);

  const updateVersion = (newVersion: string) => {
    setVersion(newVersion);
    setShowVersionModal(true);
  };

  return (
    <VersionContext.Provider value={{ version, updateVersion, showVersionModal, setShowVersionModal }}>
      {children}
    </VersionContext.Provider>
  );
}

export function useVersion() {
  const context = useContext(VersionContext);
  if (context === undefined) {
    throw new Error('useVersion must be used within a VersionProvider');
  }
  return context;
} 