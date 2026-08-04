import { useEffect, useState } from "react";

const BALANCE_HIDDEN_STORAGE_KEY = "walletko:balance-hidden";

export function useBalanceVisibility() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(BALANCE_HIDDEN_STORAGE_KEY) === "true") {
      setHidden(true);
    }
  }, []);

  const toggle = () =>
    setHidden((prev) => {
      const next = !prev;
      window.localStorage.setItem(BALANCE_HIDDEN_STORAGE_KEY, String(next));
      return next;
    });

  return { hidden, toggle };
}
