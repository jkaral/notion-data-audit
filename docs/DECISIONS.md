# Product and engineering decisions

## Start deterministic

The MVP uses five named rules instead of an opaque model-generated score. That makes every result reproducible, easy to test, and easy to explain. A later semantic layer can add value without replacing these checks.

## Read before write

Live mode requests read access to one Notion data source. The UI can preview a suggestion, but approving it only changes local browser state. This keeps the risk surface small while the product is still being validated.

## Keep credentials on the server

The browser never asks for or stores a Notion token. The API route reads `NOTION_API_KEY` and `NOTION_DATA_SOURCE_ID` from server environment variables and returns only the audit result.

## Cap the scan

Live scans stop after 500 pages. This gives the demo a predictable workload and avoids accidentally walking a very large workspace. Production would replace the cap with a queued scan and progress tracking.

## No database in the MVP

The audit result can be exported as Markdown, and fix approvals last for the current browser session. A database becomes useful when the product needs accounts, scan history, and team approvals—not before.

## Treat AI readiness as data quality

AI tools answer more reliably when their source material has clear field meanings, complete values, consistent categories, unique names, and current information. Notion Data Audit measures those underlying conditions instead of claiming to grade an AI model directly.
