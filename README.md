# E2E Tests for Kreivo

This repository contains a series of end-to-end tests that can showcase how to use Kreivo (a.k.a. `virto-node`).

## Requirements

You'll need a connection to a Kreivo RPC node. Usually, prefer a node bootstrapped using `zombienet`.
Also, you'll need [Node.js](https://nodejs.org) 20 or later.

## Setup

1. Configure the `.env` file to set the connection to the chain endpoint that Chopsticks will use:

```env
CHAIN_ENDPOINT=ws://localhost:20000
```

2. Install the package dependencies

```bash
npm i
```

## Usage

```bash
npm test
```
