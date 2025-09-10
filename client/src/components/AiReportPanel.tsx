import React from "react";

type Props = {
  projectId: string;
  runId: string;
};

type LlmArtifacts = {
  projectId: string;
  runId: string;
  reportText: string;
  verdictText: string; // "Fail" | "Rec" | "OK" (может прийти с лишними пробелами)
  issues: any[];
};

function normalizeVerdict(v?: string) {
  const t = (v || "").trim().toUpperCase();
  if (t.startsWith("FAIL")) return "Fail";
  if (t.startsWith("REC")) return "Rec";
  if (t.startsWith("OK")) return "OK";
  return "OK";
}

export default function AiReportPanel({ projectId, runId }: Props) {
  const [data, setData] = React.useState<LlmArtifacts | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function fetchArtifacts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/run/${encodeURIComponent(runId)}/llm-artifacts`);
      if (res.status === 404) {
        setData(null);
        setError("AI-артефакты ещё не готовы. Нажмите «Обновить» позже.");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e:any) {
      setError(e?.message || "Ошибка запроса артефактов");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchArtifacts();
    // Можно оставить один авто-запрос при монтировании; авто-поллинг не вводим.
  }, [projectId, runId]);

  function copyReport() {
    if (!data?.reportText) return;
    navigator.clipboard?.writeText(data.reportText).catch(() => {});
  }

  function downloadReport() {
    if (!data?.reportText) return;
    const blob = new Blob([data.reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai_report_${runId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const verdict = normalizeVerdict(data?.verdictText);
  const verdictColor =
    verdict === "Fail" ? "#ff3b30" :
    verdict === "Rec"  ? "#ff9f0a" :
                         "#34c759";

  return (
    <div style={{ border:"1px solid #e5e7eb", borderRadius:12, padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <h3 style={{ margin:0 }}>AI-отчёт</h3>
          <span style={{
            display:"inline-block",
            padding:"2px 8px",
            borderRadius:999,
            background: verdictColor,
            color:"#fff",
            fontWeight:600,
            fontSize:12
          }}>{verdict}</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={fetchArtifacts} disabled={loading} style={{ padding:"6px 10px" }}>
            {loading ? "Обновление..." : "Обновить"}
          </button>
          <button onClick={copyReport} disabled={!data} style={{ padding:"6px 10px" }}>
            Скопировать
          </button>
          <button onClick={downloadReport} disabled={!data} style={{ padding:"6px 10px" }}>
            Скачать .txt
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background:"#fffbe6", border:"1px solid #ffe58f", padding:12, borderRadius:8, marginBottom:12 }}>
          {error}
        </div>
      )}

      <div style={{
        border:"1px solid #e5e7eb",
        borderRadius:8,
        background:"#fafafa",
        padding:12,
        whiteSpace:"pre-wrap",
        fontFamily:"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
        fontSize:13,
        lineHeight:"1.45"
      }}>
        {data?.reportText || "Отчёт ещё не сформирован."}
      </div>
    </div>
  );
}
