import { useState } from "react";
import "./styles.css";

import { UploadCard } from "./components/UploadCard";
import type { UploadedFile } from "./types";
import { analyzeProgramFiles } from "./parsers/ablAnalyzer";
import { parseDfFiles } from "./parsers/dfParser";
import { analyzeIndexUsage } from "./parsers/indexAdvisor";
import type { IndexMatchResult } from "./parsers/indexAdvisor";

type OutputType = "log" | "index" | "warning" | "suggestion" | "error";

type OutputLine = {
  text: string;
  type: OutputType;
};

function App() {
  const [programFiles, setProgramFiles] = useState<UploadedFile[]>([]);
  const [dfFiles, setDfFiles] = useState<UploadedFile[]>([]);
  const [output, setOutput] = useState<OutputLine[]>([]);

  /** Append a line to the output console */
  const appendOutput = (text: string, type: OutputType = "log") => {
    setOutput(prev => [...prev, { text, type }]);
  };

  /** Prints the index analysis report to the UI console */
  const printIndexReport = (report: IndexMatchResult[]) => {
    report.forEach(r => {
      if (r.warning) {
        appendOutput(`⚠️  Table "${r.table}" → ${r.warning}`, "warning");
      }

      if (r.bestIndex) {
        const status = r.bestIndex.isPerfect
          ? "perfect index"
          : `partial match (${r.bestIndex.matchCount} fields)`;

        appendOutput(
          `Table "${r.table}": recommended index "${r.bestIndex.name}" (${status})`,
          "index"
        );
      }

      if (r.suggestion) {
        appendOutput(
          `Index suggestion for "${r.table}":\n${r.suggestion}\n`,
          "suggestion"
        );
      }

      if (!r.bestIndex && !r.warning) {
        appendOutput(
          `Table "${r.table}": no compatible index found`,
          "error"
        );
      }
    });
  };

  /** Main flow: read files, analyze, and log results */
  const handleRunAnalysis = async () => {
    try {
      setOutput([]);
      appendOutput("Starting analysis...");

      const log = (msg: string) => appendOutput(msg);

      appendOutput("Analyzing Progress programs...");
      const programAnalysis = await analyzeProgramFiles(programFiles, log);

      appendOutput("Reading DF files...");
      const dfAnalysis = await parseDfFiles(dfFiles, log);

      appendOutput("Comparing FOR/FIND statements with indexes...");
      const indexReport = analyzeIndexUsage(programAnalysis, dfAnalysis);

      console.log("=== INDEX REPORT ===");
      console.log(indexReport);

      printIndexReport(indexReport);

      appendOutput("Generating final JSON...");

      console.log(
        "%cABL INDEX ANALYZER",
        "color: #4ade80; font-weight: bold;"
      );
      console.log({
        programs: programAnalysis,
        dfs: dfAnalysis,
        indexReport,
      });
      console.log("====================================");

      appendOutput("Analysis complete! Full result available in the console.");
    } catch (err) {
      console.error(err);
      appendOutput("Error while processing files.", "error");
    }
  };

  const isRunDisabled =
    programFiles.length === 0 && dfFiles.length === 0;

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>ABL Index Analyzer</h1>
        <p className="app-subtitle">
          Upload Progress programs and DF schema files for index analysis.
        </p>
      </header>

      <main className="app-main">
        <section className="upload-section">
          <UploadCard
            title="Progress Programs"
            hint={
              <>
                Click to select <code>.p</code>, <code>.w</code>,{" "}
                <code>.i</code>, <code>.cls</code> files, or drag a{" "}
                <code>.zip</code> containing them.
              </>
            }
            accept=".p,.w,.i,.cls,.zip"
            files={programFiles}
            onFilesChange={setProgramFiles}
            dragLabel="You can also drag and drop files here."
          />

          <UploadCard
            title="DF Schema Files"
            hint={
              <>
                Click to select or drag one or more <code>.df</code> files
                exported from the Data Dictionary.
              </>
            }
            accept=".df,.txt"
            files={dfFiles}
            onFilesChange={setDfFiles}
            dragLabel="Drag DF files into this area."
          />
        </section>

        <section className="actions-section">
          <button
            className="run-button"
            onClick={handleRunAnalysis}
            disabled={isRunDisabled}
          >
            Run analysis
          </button>
        </section>

        <section className="output-section">
          <h2>Analysis Output</h2>
          <div className="output-box">
            <pre className="output-pre">
              {output.map((line, i) => (
                <div key={i} className={`out-${line.type}`}>
                  {line.text}
                </div>
              ))}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
