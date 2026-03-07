import StatCard from "./StatCard";
import BinTable from "./BinTable";
import ZoneCard from "./ZoneCard";
import PowerBestsGrid from "./PowerBestsGrid";
import CPModelCard from "./CPModelCard";
import SparklineRow from "./SparklineRow";
import QuartileComparison from "./QuartileComparison";

export default function ModelDataRenderer({ modelData }) {
  if (!modelData) return null;

  return (
    <>
      {/* Stats row */}
      {modelData.stats?.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {modelData.stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>
      )}

      {/* Zone cards — HRV readiness */}
      {modelData.zones?.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {modelData.zones.map(z => <ZoneCard key={z.label} {...z} />)}
        </div>
      )}

      {/* Quartile comparison */}
      {modelData.quartileComparison && (
        <div style={{ marginBottom: 14 }}>
          <QuartileComparison data={modelData.quartileComparison} />
        </div>
      )}

      {/* Power profile grid */}
      {modelData.powerBests?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <PowerBestsGrid bests={modelData.powerBests} />
        </div>
      )}

      {/* CP Model card */}
      {modelData.cpModel && (
        <div style={{ marginBottom: 14 }}>
          <CPModelCard model={modelData.cpModel} />
        </div>
      )}

      {/* Bin table — heat, fueling, durability */}
      {modelData.bins && (
        <div style={{ marginBottom: 14 }}>
          <BinTable bins={modelData.bins} />
        </div>
      )}

      {/* Sparklines — EF, drift trends */}
      {modelData.sparklines && (
        <div style={{ marginBottom: 14 }}>
          <SparklineRow sparklines={modelData.sparklines} />
        </div>
      )}

      {/* Custom content (rendered as text or null) */}
      {modelData.custom?.note && (
        <div style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(16,185,129,0.06)", fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
          {modelData.custom.note}
        </div>
      )}
    </>
  );
}
