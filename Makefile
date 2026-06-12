# Makefile — Prompt Architect quality gates.
# Designed to run under Git Bash on Windows or any POSIX shell on Linux/macOS.
#
# PowerShell equivalents (for Windows-native users who prefer not to use Git Bash):
#
#   make setup   → npm install --no-save ajv@8 ajv-formats@3 js-yaml@4
#   make lint    → node scripts/validate.mjs; npx html-validate@8 app/index.html
#   make test    → node scripts/validate.mjs
#   make audit   → (manual checklist review — see docs/AUDIT.md)
#   make ci      → npm install --no-save ajv@8 ajv-formats@3 js-yaml@4; `
#                  node scripts/validate.mjs; npx html-validate@8 app/index.html

.DEFAULT_GOAL := help
.PHONY: help setup lint test audit ci

help: ## Show this help message.
	@grep -E '^[a-zA-Z_-]+:.*##' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*##"}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

setup: ## Install validator dependencies (ajv, ajv-formats, js-yaml) ad hoc.
	npm install --no-save --no-audit --no-fund ajv@8 ajv-formats@3 js-yaml@4

lint: ## Run all linters: plugin validator + HTML validator.
	node scripts/validate.mjs
	npx --yes html-validate@8 "app/index.html"

test: ## Run the plugin validator (structural + semantic checks).
	node scripts/validate.mjs

audit: ## Open the audit checklist in your pager for manual review.
	@echo "Opening docs/AUDIT.md — work through the checklist and tick items."
	@cat docs/AUDIT.md

ci: setup lint ## Full CI sequence: install deps, then lint (mirrors the CI workflow).
