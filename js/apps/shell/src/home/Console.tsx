import { money } from "./api";
import type { AppInfo, Dashboard } from "./types";

const CATEGORY_LABEL: Record<string, string> = {
  Scoreboards: "Scoreboards", Account: "Money", Accounting: "Money",
  Marketplace: "Local", "Site Seeing": "Discover", Shopping: "Local",
};

export function Console({ data, apps, onSignOut }: { data: Dashboard; apps: AppInfo[]; onSignOut: () => void }) {
  const firstName = data.user.displayName.split(" ")[0];
  const game = data.activeGame;
  const bal = money(data.accounts.totalBalanceMinor, data.accounts.currency);
  const net = data.splits.netMinor;
  const netAbs = money(Math.abs(net), data.splits.currency);

  // Normalize the payload arrays once so a missing/null field can't crash render.
  const nearby = data.nearby ?? [];
  const dealsList = data.deals ?? [];
  const accountItems = data.accounts.items ?? [];
  const standings = game?.standings ?? [];
  const openCount = data.splits.openCount ?? 0;

  // Per-app live state for the launcher subtitles. Labels mirror the uppercase
  // KPI badges (LIVE / OPEN); the `.csCat` style uppercases them on render.
  function appState(id: string): { label: string; live?: boolean } {
    if (game && (id === "rummy-scorecard")) return { label: "LIVE", live: true };
    if (id === "my-accounts") return { label: bal };
    if (id === "splits") return { label: `${openCount} OPEN` };
    if (id === "marketplace") return { label: `${nearby.length} vendors` };
    if (id === "near-by") return { label: `${dealsList.length} deals` };
    return { label: "idle" };
  }

  return (
    <div className="csApp">
      <div className="csWrap">
        <div className="csTop">
          <a className="csBrand" href="/"><span className="csM">M</span> METROHUB</a>
          <div className="csSearch"><span>⌕</span> Jump to an app or vendor… <kbd>⌘K</kbd></div>
          <span className="csSp" />
          <div className="csUser">
            <span className="csDot" /> {data.user.email}
            {data.membership && <span className="csPro">{data.membership.name}</span>}
            <button className="csLink" type="button" onClick={onSignOut}>Sign out</button>
          </div>
        </div>

        <div className="csHd">
          <h1>Good evening, {firstName}.</h1>
          <span className="csSub">
            {game ? <><b>1 game live</b> · </> : null}
            {openCount} splits open · {dealsList.length} deals near you
          </span>
        </div>

        <div className="csKpis">
          <div className="csKpi" data-edge="crit">
            <span className="csKl">Active game night {game && <span className="csBadge live">LIVE</span>}</span>
            {game ? (
              <>
                <span className="csKv" style={{ textTransform: "capitalize" }}>{game.gameType}</span>
                <span className="csKm">R{game.round} · {game.leader ?? "—"} leading · {standings.length} players</span>
              </>
            ) : (
              <>
                <span className="csKv">—</span>
                <span className="csKm">No game in progress</span>
              </>
            )}
          </div>
          <div className="csKpi" data-edge="acc">
            <span className="csKl">Accounts balance</span>
            <span className="csKv">{bal}</span>
            <span className="csKm">{accountItems.length} accounts</span>
          </div>
          <div className="csKpi" data-edge="warn">
            <span className="csKl">Splits {openCount > 0 && <span className="csBadge due">{openCount} OPEN</span>}</span>
            <span className="csKv">{net >= 0 ? "+" : "−"}{netAbs}</span>
            <span className="csKm">{net >= 0 ? "you're owed" : "you owe"} · settle soon</span>
          </div>
          <div className="csKpi" data-edge="good">
            <span className="csKl">Near you <span className="csBadge ok">OPEN</span></span>
            <span className="csKv">{dealsList.length} deals</span>
            <span className="csKm">{nearby.slice(0, 2).map((v) => v.name).join(" · ") || "—"}</span>
          </div>
        </div>

        <div className="csGrid">
          <div className="csPanel">
            <div className="csPh">Launcher <span className="csPhr">{apps.length} apps</span></div>
            <div className="csLaunch">
              {apps.map((a) => {
                const st = appState(a.id);
                return (
                  <a className="csAppRow" href={a.route} key={a.id}>
                    <span className="csIc">{a.icon || a.tile.title[0]}</span>
                    <span className="csNm">{a.tile.title}</span>
                    <span className="csCat">{CATEGORY_LABEL[a.category] ?? a.category}{" · "}
                      <span className={st.live ? "csLiveTxt" : ""}>{st.label}</span>
                    </span>
                    <span className="csGo">→</span>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="csPanel">
            <div className="csPh">Live table <span className="csPhr">{game ? `${game.gameType} · target ${game.targetScore}` : "no game"}</span></div>
            {game ? (
              <>
                <table className="csTbl">
                  <thead><tr><th>Player</th><th className="csR">Total</th><th className="csR">To bust</th></tr></thead>
                  <tbody>
                    {standings.map((s, i) => (
                      <tr key={`${i}-${s.name}`} className={i === 0 ? "csLead" : ""}>
                        <td>{i === 0 ? "🏆 " : ""}{s.name}</td>
                        <td className={`csR ${i === 0 ? "csTot" : ""}`}>{s.total}</td>
                        <td className={`csR ${s.toBust <= 20 ? "csWarnTxt" : "csMut"}`}>{s.toBust}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="csPf">
                  <a className="csBtn csBtnAcc" href="/apps/rummy-scorecard">Resume</a>
                  <a className="csBtn" href="/apps/rummy-scorecard">Open scorecard</a>
                </div>
              </>
            ) : (
              <div className="csEmpty">Start a scorecard to see it here.</div>
            )}
          </div>
        </div>

        <footer className="csFoot">
          <span>METROHUB</span>
          <span>{data.membership ? `${data.membership.name} member` : "Free"}</span>
          <span className="csSp2" />
          <span>www.metrohub.io</span>
        </footer>
      </div>
    </div>
  );
}
