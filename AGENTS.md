# Repository Guidelines

## Project Structure & Module Organization

The root HTML files (`index.html`, `journal.html`, `resume.html`) and `styles.css` form the GitHub Pages site. `chat.js` handles the browser chat widget. Edit post data in `blog_posts.json`; `generate_blog.py` renders the listing and pages in `journal/`. Keep site images in `assets/` or `journal/assets/`. The RAG pipeline reads text from `content/`, builds vectors with `build_embeddings.py`, and serves chat through `worker/`. Python tests live in `tests/`; Worker tests sit beside the Worker code. `docs/` contains pipeline notes.

## Build, Test, and Development Commands

- `npm install` installs the Node dependency used by the SVG rendering script.
- `python3 -m venv .venv && source .venv/bin/activate`, then `pip install -r requirements-rag.txt`, sets up the Python pipeline.
- `python generate_blog.py` regenerates `journal.html` and `journal/*.html` after post edits. Review and commit those generated pages with the source JSON.
- `python3 -m http.server 8000` serves the static site at `http://localhost:8000` for a browser check.
- `RAG_FAKE_EMBEDDINGS=1 python build_embeddings.py` checks the asset build with deterministic embeddings. `python build_embeddings.py` uses the configured embedding provider and may download a model.
- `npm test` runs both Python and Worker unit suites.

## Coding Style & Naming Conventions

Match nearby code: four spaces in Python, two in JavaScript and HTML, and no tabs. Use `snake_case` for Python functions and tests, `camelCase` for JavaScript functions, and descriptive kebab-case journal slugs such as `the-throughput-trap`. Keep each post's `slug` and `link` consistent with its generated HTML path. No formatter or linter is configured; keep changes focused and review the diff.

## Testing Guidelines

Python tests use `unittest` in `tests/test_*.py`; Worker helper tests use Node's test runner in `worker/*.test.js`. Add or update tests for changed pipeline or ranking behavior. Run `npm test` before opening a pull request, then check affected pages in a browser. The repository sets no coverage threshold.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects (`Enlarge typography...`, `Add source links...`); documentation commits sometimes use `docs:`. Keep one change per commit. In pull requests, describe the change and verification, link a relevant issue when one exists, and include screenshots for visible site changes.

## Security & Configuration

Keep R2 credentials in `private/` or GitHub Secrets, never in commits. Generated `rag/*.json` files are ignored and published to R2 by the workflow. Review `worker/wrangler.toml` and `CNAME` before changing deployment endpoints or the custom domain.
