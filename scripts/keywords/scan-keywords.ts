import { scanKeywordIdeas } from "../../lib/keywords";

function main() {
  try {
    const result = scanKeywordIdeas();
    for (const idea of result.completed) {
      console.log(`Completed: ${idea.game} / ${idea.keyword}`);
    }
    console.log(
      `Keyword scan complete: ${result.ideas.length} total, ${result.pending.length} pending, ${result.ideas.length - result.pending.length} completed, ${result.completed.length} newly completed.`
    );
  } catch (error) {
    console.error(
      `Keyword scan failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  }
}

main();
