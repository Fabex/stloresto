import { useState } from "react";
import { DailyMenuPage } from "./pages/DailyMenuPage";
import { WeeklyHighlightsPage } from "./pages/WeeklyHighlightsPage";

type TabKey = "daily" | "weekly" | "admin";

const PRISMIC_ADMIN_URL = "https://saintlaurenttest.prismic.io"; // 👈 remplace par ton repo

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("daily");

  return (
    <div style={{ padding: "1.5rem", maxWidth: 800, margin: "0 auto" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ marginBottom: "0.25rem" }}>Resto Menu</h1>
        <p style={{ marginTop: 0, opacity: 0.7 }}>
          Génération d&apos;images depuis Prismic.
        </p>
      </header>

      {/* Onglets */}
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === "daily" ? "tab-button-active" : ""}`}
          onClick={() => setActiveTab("daily")}
        >
          Menu du jour
        </button>
        <button
          className={`tab-button ${activeTab === "weekly" ? "tab-button-active" : ""}`}
          onClick={() => setActiveTab("weekly")}
        >
          Plats de la semaine
        </button>
        <button
          className={`tab-button ${activeTab === "admin" ? "tab-button-active" : ""}`}
          onClick={() => setActiveTab("admin")}
        >
          Admin
        </button>
      </div>

      <div className="tab-panel">
        {activeTab === "daily" && (
          <section>
            <DailyMenuPage />
          </section>
        )}

        {activeTab === "weekly" && (
          <section>
            <WeeklyHighlightsPage />
          </section>
        )}

        {activeTab === "admin" && (
          <section>
            <h2>Admin</h2>
            <p style={{ marginBottom: "1rem" }}>
              Ouvre l&apos;interface Prismic pour gérer les plats, le menu du jour
              et les plats de la semaine.
            </p>
            <a href={PRISMIC_ADMIN_URL} target="_blank" rel="noreferrer">
              <button>Ouvrir l&apos;interface Prismic</button>
            </a>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
