"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { getInitialMoneyHidden, MONEY_VISIBILITY_STORAGE_KEY } from "@/lib/money-visibility";

interface MoneyVisibilityContextValue {
  isMoneyHidden: boolean;
  toggleMoneyVisibility: () => void;
}

const MoneyVisibilityContext = createContext<MoneyVisibilityContextValue | null>(null);

export function MoneyVisibilityProvider({ children }: { children: ReactNode }) {
  const [isMoneyHidden, setIsMoneyHidden] = useState(() =>
    getInitialMoneyHidden(typeof window === "undefined" ? null : window.localStorage.getItem(MONEY_VISIBILITY_STORAGE_KEY))
  );

  function toggleMoneyVisibility() {
    setIsMoneyHidden((current) => {
      const next = !current;
      window.localStorage.setItem(MONEY_VISIBILITY_STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <MoneyVisibilityContext.Provider value={{ isMoneyHidden, toggleMoneyVisibility }}>
      {children}
    </MoneyVisibilityContext.Provider>
  );
}

export function useMoneyVisibility() {
  const context = useContext(MoneyVisibilityContext);

  if (!context) {
    throw new Error("useMoneyVisibility must be used within MoneyVisibilityProvider");
  }

  return context;
}
