# Open-Weight AI Models and Hardware Requirements

NoBugs AI uses local open-weight instruction models via Ollama to perform incident root-cause diagnosis. This document details model options, licensing, hardware sizing, and setup instructions.

---

## Recommended Models

| Model | Parameters | License | Context Window | Recommended Hardware | Primary Strengths |
|---|---|---|---|---|---|
| **Llama 3.2** (Default) | 3B | Llama 3.2 Community License (Commercial-friendly) | 128k tokens | 8GB Unified RAM / 4GB VRAM | Ultra-fast inference, low resource consumption, excellent JSON schema compliance |
| **Qwen 2.5 Coder** | 7B | Apache 2.0 | 32k tokens | 16GB Unified RAM / 8GB VRAM | Superior code & stack trace reasoning, precise root cause extraction |
| **Mistral 7B Instruct** | 7B | Apache 2.0 | 32k tokens | 16GB Unified RAM / 8GB VRAM | Strong multi-turn analysis, conservative factual grounding |
| **Llama 3.1** | 8B | Llama 3.1 Community License | 128k tokens | 16GB Unified RAM / 8GB VRAM | Broad multi-lingual knowledge and deep contextual correlation |

---

## Hardware Sizing Guide

### Minimal Developer Machine (8GB RAM)
- **Model**: `llama3.2:3b` (or `llama3.2:1b`)
- **Memory Footprint**: ~2.5 GB RAM during inference
- **Inference Speed**: ~40-60 tokens/second on Apple Silicon M-series or Intel/AMD with AVX2.

### Standard Engineering Workstation (16GB - 32GB RAM)
- **Model**: `qwen2.5-coder:7b` or `llama3.1:8b`
- **Memory Footprint**: ~5.5 GB VRAM
- **Inference Speed**: ~25-45 tokens/second on Apple Silicon or NVIDIA RTX 3060/4060.

---

## Setup Instructions

### 1. Install Ollama
- **macOS (Homebrew)**:
  ```bash
  brew install ollama
  ```
- **Linux**:
  ```bash
  curl -fsSL https://ollama.com/install.sh | sh
  ```
- **Windows**:
  Download installer from [https://ollama.com/download](https://ollama.com/download).

### 2. Start Ollama Service
```bash
ollama serve
```
By default, the daemon listens at `http://127.0.0.1:11434`.

### 3. Pull the Target Model
```bash
ollama pull llama3.2
```
To use Qwen 2.5 Coder instead:
```bash
ollama pull qwen2.5-coder:7b
```
And set `OLLAMA_MODEL=qwen2.5-coder:7b` in your `.env` file.

### 4. Offline Fallback Mode
If Ollama is not installed or running, NoBugs AI automatically operates in **Offline Safe Mode**, using an internal heuristic engine to process logs and generate diagnoses without stalling the application.
