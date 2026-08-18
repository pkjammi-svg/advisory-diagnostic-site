import { useEffect, useState, useCallback } from "react";
import { api } from "./api/client";
import type { DashboardResponse, TradeLogResponse } from "./api/types";
import Header from "./components/Header";
import BestPickHero from "./components/BestPickHero";
import RegimeSummary from "./components/RegimeSummary";
import PortfolioView from "./components/PortfolioView";
import Shortlist from "./components/Shortlist";
import InstrumentCard from "./components/InstrumentCard";
import TradeLogPanel from "./components/TradeLogPanel";
import Footer from "./components/Footer";

export default function App() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [tradeLog, setTradeLog] = useState<TradeLogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [d, t] = await Promise.all([api.dashboard(), api.tradeLog()]);
      setDashboard(d);
      setTradeLog(t);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await api.runPipeline();
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-6">
        <div>
          <div className="text-red-400 font-semibold mb-2">Couldn't reach the backend</div>
          <div className="text-neutral-400 text-sm max-w-md">{error}</div>
          <div className="text-neutral-500 text-xs mt-3">
            Make sure the API is running (uvicorn app.main:app --port 8000) and the DB has been
            seeded (python -m scripts.run_full_pipeline).
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard || !tradeLog) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-500">Loading…</div>;
  }

  const cardsToShow = dashboard.shortlist.filter((c) => !selectedSymbol || c.instrument.symbol === selectedSymbol);

  return (
    <div className="min-h-screen pb-8">
      <Header data={dashboard} onRefresh={handleRefresh} refreshing={refreshing} />
      <BestPickHero pick={dashboard.best_pick} noTradeToday={dashboard.no_trade_today} />
      <RegimeSummary data={dashboard} />
      <PortfolioView data={dashboard} />
      <Shortlist shortlist={dashboard.shortlist} onSelect={(s) => setSelectedSymbol(s === selectedSymbol ? null : s)} selectedSymbol={selectedSymbol} />

      <section className="max-w-7xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm uppercase tracking-widest text-neutral-400">
            Candidate Detail {selectedSymbol ? `— ${selectedSymbol}` : "(Best Pick + Runner-ups first)"}
          </h2>
          {selectedSymbol && (
            <button onClick={() => setSelectedSymbol(null)} className="text-xs text-indigo-400 hover:underline">
              show all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cardsToShow.map((c) => (
            <InstrumentCard key={c.instrument.symbol} card={c} />
          ))}
        </div>
      </section>

      <TradeLogPanel data={tradeLog} bestPick={dashboard.best_pick} onChanged={loadAll} />

      <Footer disclaimer={dashboard.meta.disclaimer} />
    </div>
  );
}
