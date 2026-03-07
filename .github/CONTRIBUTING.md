# Contributing

## Table of Contents

- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
- [Development workflow](#development-workflow)
  - [Available commands](#available-commands)
- [Submitting changes](#submitting-changes)
  - [Before submitting](#before-submitting)
  - [Pull request process](#pull-request-process)
- [Using AI](#using-ai)

## Getting started

### Prerequisites

- Latest version of [Bun](https://bun.com)

### Setup

Fork and clone the repository

Install dependencies

```bash
bun install
```

## Development workflow

### Available commands

```bash
# Build packages
bun run build

# Run linter
bun lint

# Format code
bun format

# # Run all tests
bun run test
```

## Submitting changes

### Before submitting

1. format code: `bun format`
2. run linting: `bun lint`
3. run tests: `bun run test`

### Pull request process

1. create a feature branch from `main`
2. make your changes
3. push your branch and open a pull request
4. ensure CI checks pass (lint, tests)
5. wait for review from maintainers

## Using AI

You're welcome to use AI tools to help you contribute. But there are two important ground rules:

### 1. Never let an LLM speak for you

When you write a comment, issue, or PR description, use your own words. Grammar and spelling don't matter &ndash; real connection does. AI-generated summaries tend to be long-winded, dense, and often inaccurate. Simplicity is an art. The goal is not to sound impressive, but to communicate clearly.

### 2. Never let an LLM think for you

Feel free to use AI to write code, tests, or point you in the right direction. But always understand what it's written before contributing it. Take personal responsibility for your contributions. Don't say "ChatGPT says..." &ndash; tell us what _you_ think.

For more context, see [Using AI in open source](https://roe.dev/blog/using-ai-in-open-source).
