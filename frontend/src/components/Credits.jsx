import { useEffect, useState } from "react";
import {
  getCredits,
  getCreditTransactions,
  checkoutCredits,
  verifyCreditPayment,
} from "../api.js";

export default function Credits({
  onBack,
  balance: externalBalance,
  onBalanceChange,
}) {
  const [balance, setBalance] = useState(
    Number(externalBalance ?? 0)
  );

  const [transactions, setTransactions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [buying, setBuying] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const CoinIcon = ({ size = 48 }) => {
    return (
      <div
        style={{
          ...styles.coin,
          width: size,
          height: size,
          minWidth: size,
        }}
      >
        <div
          style={{
            ...styles.coinInner,
            width: Math.round(
              size * 0.72
            ),
            height: Math.round(
              size * 0.72
            ),
          }}
        />
      </div>
    );
  };

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

      if (onBalanceChange) {
        onBalanceChange(nextBalance);
      }
    } catch (e) {
      setError(
        e?.message ||
          "Could not load your credits."
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
            e?.message ||
              "We could not verify the payment."
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
        e?.message ||
          "Could not start payment."
      );

      setBuying("");
    }
  };

  /*
   * ---------------------------------------------------------
   * FORMAT TRANSACTION
   * ---------------------------------------------------------
   */

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return date.toLocaleDateString(
      undefined,
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  };

  const formatType = (type) => {
    if (!type) return "Credit activity";

    const labels = {
      purchase: "Credit purchase",
      analysis: "Statistical analysis",
      chapter4: "Chapter 4 generation",
    };

    return (
      labels[type] ||
      type
        .replace(/_/g, " ")
        .replace(
          /^\w/,
          (x) => x.toUpperCase()
        )
    );
  };

  return (
    <section style={styles.page}>
      {/* TOP BAR */}

      <div style={styles.topbar}>
        <button
          type="button"
          className="flow-back"
          onClick={onBack}
        >
          <span>←</span>
          <span>Back</span>
        </button>
      </div>

      {/* INTRO */}

      <div style={styles.intro}>
        <div className="section-kicker">
          CREDITS
        </div>

        <h1 style={styles.title}>
          Your credits.
        </h1>

        <p style={styles.lead}>
          Use credits when Adanse performs
          analysis and generates research
          results.
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div
          style={styles.alertError}
        >
          {error}
        </div>
      )}

      {/* SUCCESS */}

      {success && (
        <div
          style={styles.alertSuccess}
        >
          {success}
        </div>
      )}

      {/* BALANCE */}

      <div style={styles.balanceCard}>
        <div style={styles.balanceCoin}>
          <CoinIcon size={58} />
        </div>

        <div>
          <span style={styles.balanceLabel}>
            AVAILABLE BALANCE
          </span>

          <div style={styles.balanceRow}>
            <strong style={styles.balanceNumber}>
              {loading
                ? "—"
                : balance.toLocaleString()}
            </strong>

            <span style={styles.balanceText}>
              credits
            </span>
          </div>
        </div>
      </div>

      {/* BUY CREDITS */}

      <div style={styles.section}>
        <div className="section-kicker">
          BUY CREDITS
        </div>

        <div style={styles.packageGrid}>
          {/* 400 */}

          <div style={styles.packageCard}>
            <div style={styles.packageTop}>
              <CoinIcon size={44} />

              <div>
                <h2 style={styles.packageTitle}>
                  400 credits
                </h2>

                <p
                  style={
                    styles.packageDescription
                  }
                >
                  Good for getting started.
                </p>
              </div>
            </div>

            <div
              style={
                styles.packageDivider
              }
            />

            <div
              style={
                styles.packageBottom
              }
            >
              <div style={styles.priceWrap}>
                <span
                  style={styles.currency}
                >
                  GHS
                </span>

                <strong
                  style={styles.price}
                >
                  20
                </strong>
              </div>

              <button
                type="button"
                className="btn"
                style={styles.buyButton}
                onClick={() =>
                  buy("starter")
                }
                disabled={
                  Boolean(buying) ||
                  loading
                }
              >
                {buying ===
                "starter"
                  ? "Opening…"
                  : "Buy credits"}
              </button>
            </div>
          </div>

          {/* 1,000 */}

          <div
            style={{
              ...styles.packageCard,
              ...styles.featuredPackage,
            }}
          >
            <div style={styles.valueBadge}>
              Best value
            </div>

            <div style={styles.packageTop}>
              <CoinIcon size={44} />

              <div>
                <h2 style={styles.packageTitle}>
                  1,000 credits
                </h2>

                <p
                  style={
                    styles.packageDescription
                  }
                >
                  More room for larger
                  research.
                </p>
              </div>
            </div>

            <div
              style={
                styles.packageDivider
              }
            />

            <div
              style={
                styles.packageBottom
              }
            >
              <div style={styles.priceWrap}>
                <span
                  style={styles.currency}
                >
                  GHS
                </span>

                <strong
                  style={styles.price}
                >
                  45
                </strong>
              </div>

              <button
                type="button"
                className="btn"
                style={styles.buyButton}
                onClick={() =>
                  buy("value")
                }
                disabled={
                  Boolean(buying) ||
                  loading
                }
              >
                {buying ===
                "value"
                  ? "Opening…"
                  : "Buy credits"}
              </button>
            </div>
          </div>
        </div>

        <p style={styles.paymentNote}>
          Payments will be securely processed
          through Paystack.
        </p>
      </div>

      {/* HOW IT WORKS */}

      <div style={styles.section}>
        <div className="section-kicker">
          HOW IT WORKS
        </div>

        <div style={styles.infoCard}>
          <div style={styles.infoRow}>
            <div style={styles.infoNumber}>
              01
            </div>

            <div>
              <strong style={styles.infoTitle}>
                Start your research
              </strong>

              <p
                style={
                  styles.infoDescription
                }
              >
                Create your project, upload your
                dataset and build your analysis
                plan without using credits.
              </p>
            </div>
          </div>

          <div style={styles.infoRow}>
            <div style={styles.infoNumber}>
              02
            </div>

            <div>
              <strong style={styles.infoTitle}>
                Use credits for analysis
              </strong>

              <p
                style={
                  styles.infoDescription
                }
              >
                Credits are used when Adanse
                performs statistical analysis
                and generates research outputs.
              </p>
            </div>
          </div>

          <div
            style={{
              ...styles.infoRow,
              borderBottom: "none",
            }}
          >
            <div style={styles.infoNumber}>
              03
            </div>

            <div>
              <strong style={styles.infoTitle}>
                Buy more when you need them
              </strong>

              <p
                style={
                  styles.infoDescription
                }
              >
                When your balance runs low,
                purchase another credit package
                and continue your research.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TRANSACTION HISTORY */}

      <div style={styles.section}>
        <div className="section-kicker">
          TRANSACTION HISTORY
        </div>

        {loading &&
        transactions.length === 0 ? (
          <div
            style={
              styles.transactionCard
            }
          >
            <div style={styles.emptyTitle}>
              Loading transactions…
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div
            style={
              styles.transactionCard
            }
          >
            <div style={styles.transactionIcon}>
              <CoinIcon size={52} />
            </div>

            <h2 style={styles.emptyTitle}>
              No transactions yet
            </h2>

            <p
              style={
                styles.emptyDescription
              }
            >
              Your credit purchases and usage
              will appear here.
            </p>
          </div>
        ) : (
          <div
            style={
              styles.transactionList
            }
          >
            {transactions.map(
              (transaction) => {
                const amount =
                  Number(
                    transaction.amount
                  );

                const positive =
                  amount > 0;

                return (
                  <div
                    key={
                      transaction.id
                    }
                    style={
                      styles.transactionRow
                    }
                  >
                    <div
                      style={
                        styles.transactionLeft
                      }
                    >
                      <div
                        style={
                          styles.transactionCoin
                        }
                      >
                        <CoinIcon size={34} />
                      </div>

                      <div>
                        <strong
                          style={
                            styles.transactionTitle
                          }
                        >
                          {formatType(
                            transaction.type
                          )}
                        </strong>

                        <span
                          style={
                            styles.transactionDate
                          }
                        >
                          {formatDate(
                            transaction.created_at
                          )}
                        </span>
                      </div>
                    </div>

                    <div
                      style={
                        styles.transactionRight
                      }
                    >
                      <strong
                        style={{
                          ...styles.transactionAmount,
                          color: positive
                            ? "var(--green)"
                            : "var(--ink)",
                        }}
                      >
                        {positive
                          ? "+"
                          : ""}
                        {amount.toLocaleString()}
                      </strong>

                      <span
                        style={
                          styles.transactionBalance
                        }
                      >
                        {Number(
                          transaction.balance_after ||
                            0
                        ).toLocaleString()}{" "}
                        remaining
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const styles = {
  page: {
    maxWidth: "1100px",
    margin: "0 auto",
    paddingBottom: "80px",
  },

  topbar: {
    marginBottom: "35px",
  },

  intro: {
    marginBottom: "35px",
  },

  title: {
    font: "600 clamp(40px, 5vw, 58px) / 1.02 var(--display)",
    letterSpacing: "-0.055em",
    margin: "0 0 14px",
  },

  lead: {
    margin: 0,
    color: "var(--muted)",
    fontSize: "17px",
    lineHeight: 1.65,
    maxWidth: "650px",
  },

  alertError: {
    marginBottom: "20px",
    padding: "14px 16px",
    borderRadius: "12px",
    background:
      "rgba(180, 55, 55, 0.08)",
    border:
      "1px solid rgba(180, 55, 55, 0.18)",
    color: "#a33",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  alertSuccess: {
    marginBottom: "20px",
    padding: "14px 16px",
    borderRadius: "12px",
    background:
      "rgba(44, 126, 82, 0.08)",
    border:
      "1px solid rgba(44, 126, 82, 0.18)",
    color: "var(--green)",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  coin: {
    position: "relative",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "var(--gold)",
    boxSizing: "border-box",
    boxShadow:
      "inset 0 -2px 0 rgba(0, 0, 0, 0.10)",
  },

  coinInner: {
    borderRadius: "50%",
    border:
      "1px solid rgba(255, 255, 255, 0.28)",
    boxSizing: "border-box",
  },

  balanceCard: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    padding: "26px 30px",
    background: "var(--green)",
    borderRadius: "20px",
    boxShadow: "var(--shadow)",
  },

  balanceCoin: {
    flexShrink: 0,
  },

  balanceLabel: {
    display: "block",
    color:
      "rgba(255, 255, 255, 0.72)",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    marginBottom: "5px",
  },

  balanceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "8px",
  },

  balanceNumber: {
    color: "#fff",
    font: "600 44px var(--display)",
    letterSpacing: "-0.04em",
    lineHeight: 1,
  },

  balanceText: {
    color:
      "rgba(255, 255, 255, 0.75)",
    fontSize: "15px",
  },

  section: {
    marginTop: "48px",
  },

  packageGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "20px",
  },

  packageCard: {
    position: "relative",
    background: "var(--surface)",
    border:
      "1px solid var(--line)",
    borderRadius: "20px",
    padding: "25px",
    boxShadow: "var(--shadow)",
  },

  featuredPackage: {
    borderColor: "var(--gold)",
  },

  valueBadge: {
    position: "absolute",
    top: "18px",
    right: "18px",
    padding: "6px 9px",
    borderRadius: "999px",
    background: "var(--gold-soft)",
    color: "var(--ink)",
    fontSize: "10px",
    fontWeight: 700,
  },

  packageTop: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    minHeight: "44px",
  },

  packageTitle: {
    margin: 0,
    font: "600 21px var(--display)",
    letterSpacing: "-0.025em",
  },

  packageDescription: {
    margin: "4px 0 0",
    color: "var(--muted)",
    fontSize: "13px",
  },

  packageDivider: {
    height: "1px",
    background: "var(--line)",
    margin: "25px 0 20px",
  },

  packageBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
  },

  priceWrap: {
    display: "flex",
    alignItems: "baseline",
    gap: "5px",
  },

  currency: {
    color: "var(--muted)",
    fontSize: "12px",
    fontWeight: 600,
  },

  price: {
    font: "600 32px var(--display)",
    letterSpacing: "-0.04em",
  },

  buyButton: {
    minWidth: "120px",
  },

  paymentNote: {
    margin:
      "14px 0 0",
    color: "var(--muted)",
    fontSize: "12px",
  },

  infoCard: {
    background: "var(--surface)",
    border:
      "1px solid var(--line)",
    borderRadius: "20px",
    boxShadow: "var(--shadow)",
  },

  infoRow: {
    display: "flex",
    gap: "20px",
    padding: "23px 25px",
    borderBottom:
      "1px solid var(--line)",
  },

  infoNumber: {
    color: "var(--gold)",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "0.08em",
    paddingTop: "3px",
    minWidth: "25px",
  },

  infoTitle: {
    display: "block",
    marginBottom: "5px",
    fontSize: "15px",
  },

  infoDescription: {
    margin: 0,
    color: "var(--muted)",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  transactionCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    minHeight: "220px",
    padding: "35px",
    background: "var(--surface)",
    border:
      "1px solid var(--line)",
    borderRadius: "20px",
    boxShadow: "var(--shadow)",
  },

  transactionIcon: {
    marginBottom: "18px",
    opacity: 0.8,
  },

  emptyTitle: {
    margin: 0,
    font: "600 20px var(--display)",
    letterSpacing: "-0.025em",
  },

  emptyDescription: {
    margin:
      "7px 0 0",
    maxWidth: "390px",
    color: "var(--muted)",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  transactionList: {
    background: "var(--surface)",
    border:
      "1px solid var(--line)",
    borderRadius: "20px",
    boxShadow: "var(--shadow)",
    overflow: "hidden",
  },

  transactionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    padding: "18px 22px",
    borderBottom:
      "1px solid var(--line)",
  },

  transactionLeft: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    minWidth: 0,
  },

  transactionCoin: {
    flexShrink: 0,
  },

  transactionTitle: {
    display: "block",
    fontSize: "14px",
  },

  transactionDate: {
    display: "block",
    marginTop: "3px",
    color: "var(--muted)",
    fontSize: "11px",
  },

  transactionRight: {
    flexShrink: 0,
    textAlign: "right",
  },

  transactionAmount: {
    display: "block",
    fontSize: "15px",
  },

  transactionBalance: {
    display: "block",
    marginTop: "3px",
    color: "var(--muted)",
    fontSize: "11px",
  },
};