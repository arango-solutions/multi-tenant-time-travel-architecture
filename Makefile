.PHONY: help setup setup-dev test validate demo demo-auto deploy deploy-demo visualizer reset lint lint-fix clean aqlize

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: ## Install dependencies
	pip install -r requirements.txt

setup-dev: ## Install development dependencies
	pip install -r requirements.txt
	pip install ruff pre-commit
	pre-commit install

test: ## Run unit tests (no database required)
	PYTHONPATH=. python3 -m unittest discover -s src/validation -p "test_*.py" -v

validate: ## Run database validation suite (requires ArangoDB connection)
	PYTHONPATH=. python3 src/validation/validation_suite.py

demo: ## Run interactive demo
	PYTHONPATH=. python3 demos/automated_demo_walkthrough.py --interactive

demo-auto: ## Run auto-advance demo
	PYTHONPATH=. python3 demos/automated_demo_walkthrough.py --auto-advance --pause-duration 5

deploy: ## Deploy database (production TTL)
	PYTHONPATH=. python3 src/database/database_deployment.py

deploy-demo: ## Deploy database with demo TTL (5-minute expiry)
	PYTHONPATH=. python3 src/database/database_deployment.py --demo-mode

visualizer: ## Install/update visualizer assets (theme, queries, actions)
	PYTHONPATH=. python3 scripts/setup/install_visualizer.py

reset: ## Reset database to clean state
	PYTHONPATH=. python3 tools/reset_database.py

lint: ## Run linter
	ruff check src/ demos/ tools/

lint-fix: ## Run linter with auto-fix
	ruff check --fix src/ demos/ tools/

aqlize: ## Natural language → AQL via AQLizer (Q="your question")
	PYTHONPATH=. python3 scripts/aqlizer_demo.py aqlize "$(Q)"

clean: ## Remove generated files and caches
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf .ruff_cache .pytest_cache
