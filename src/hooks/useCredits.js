import { useEffect, useState } from "react";
import {
  getCredits,
  getCreditTransactions,
  checkoutCredits,
  verifyCreditPayment,
} from "../api.js";
import { friendly } from "../errors.js";

/*
 * ---------------------------------------------------------
 * useCredits
 * ---------------------------------------------------------
 *
 * Owns the Credits screen's data: balance, transaction
 * history, verifying a Paystack payment on return, and
 * starting a new purchase. Credits.jsx only renders what
 * this returns.
 */
export function useCredits({
  initialBalance = 0,
  onBalanceChange,
} = {}) {
  const [balance, setBalance] = useState(
    Number(initialBalance ?? 0)
  );

  const [transactions, setTransactions] =
    useState([]);

  const [packages, setPackages] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [buying, setBuying] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /*
   * ---------------------------------------------------------
   * LOAD CREDITS
   * ---------------------------------------------------------
   */

  const loadCredits = async () => {
    try {
      setLoading(true);
      setError("");

      const [creditData, transactionData] =
        await Promise.all([
          getCredits(),
          getCreditTransactions(),
        ]);

      const nextBalance = Number(
        creditData?.balance || 0
      );

      setBalance(nextBalance);

      setTransactions(
        transactionData?.transactions || []
      );

      /*
       * Package cards (Credits.jsx) render from this instead
       * of hardcoding credits/price/name -- an array (possibly
       * empty, e.g. if the backend has none configured) rather
       * than undefined, so the screen can distinguish "still
       * loading" from "loaded, nothing to show" and render
       * accordingly instead of crashing on a missing .map().
       */
      setPackages(
        Array.isArray(creditData?.packages)
          ? creditData.packages
          : []
      );

      if (onBalanceChange) {
        onBalanceChange(nextBalance);
      }
    } catch (e) {
      setError(
        friendly(e, "Could not load your credits.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCredits();
  }, []);

  /*
   * ---------------------------------------------------------
   * HANDLE PAYSTACK RETURN
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const reference =
      params.get("reference");

    if (!reference) {
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess(
          "Verifying your payment…"
        );

        await verifyCreditPayment(
          reference
        );

        if (cancelled) return;

        /*
         * Remove the Paystack reference from
         * the browser URL.
         */

        const cleanUrl =
          window.location.pathname;

        window.history.replaceState(
          {},
          document.title,
          cleanUrl
        );

        await loadCredits();

        if (!cancelled) {
          setSuccess(
            "Payment confirmed. Your credits are ready."
          );
        }
      } catch (e) {
        if (!cancelled) {
          setSuccess("");
          setError(
            friendly(e, "We could not verify the payment.")
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * BUY CREDITS
   * ---------------------------------------------------------
   */

  const buy = async (packageId) => {
    if (buying) return;

    setBuying(packageId);
    setError("");
    setSuccess("");

    try {
      const result =
        await checkoutCredits(
          packageId
        );

      if (
        !result?.authorization_url
      ) {
        throw new Error(
          "Paystack did not return a checkout URL."
        );
      }

      /*
       * Send the user directly to Paystack.
       */

      window.location.assign(
        result.authorization_url
      );
    } catch (e) {
      setError(
        friendly(e, "Could not start payment.")
      );

      setBuying("");
    }
  };

  return {
    balance,
    transactions,
    packages,
    loading,
    buying,
    error,
    success,
    buy,
  };
}
