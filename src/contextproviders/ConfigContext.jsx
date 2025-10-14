// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect } from "react";
import useApi from "../hooks/useApi";

const ConContext = createContext(null);

export function ConfigContextAuthProvider({ children }) {
  const { execute, data, loading, error } = useApi();

  useEffect(() => {
    execute('/fetchconfig');
  }, [execute]);

  const value = {
    configData: data,
    loading,
    error
  };

  return <ConContext.Provider value={value}>{children}</ConContext.Provider>;
}

export const useConfig = () => {
  const context = useContext(ConContext);
  if (context === null) {
    throw new Error("configContext must be used within an AuthProvider");
  }
  return context;
};