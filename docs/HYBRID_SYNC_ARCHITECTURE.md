# 🛸 Arquitetura de Sincronia Híbrida (Nexus Local ↔ Cloud Colab)

Este documento detalha o workflow industrial de integração entre a fábrica de vídeo local e o processamento de inteligência artificial na nuvem (Google Colab).

## 1. O Conceito: "Hot Folders" de Dados
Para evitar a complexidade de APIs e garantir a persistência, utilizamos o **Google Drive** como um sistema de arquivos compartilhado e o **rclone** como o agente de transporte IPC (Inter-Process Communication) de longa distância.

## 2. Estrutura de Diretórios (Espelhada)

### Local (Fábrica 'ensaio')
- /pipeline/sync_drive/texts/: Pasta de saída para roteiros e prompts.
- /pipeline/sync_drive/audio_ready/: Pasta de entrada para áudios e JSONs de sincronia.

### Cloud (Google Drive 'nexus_pipeline/')
- /texts/: Monitorada pelo Notebook do Colab.
- /audio_ready/: Destino final do processamento de IA.

## 3. Fluxo de Trabalho Industrial

### Passo 1: Exportação (Local -> Cloud)
O roteiro gerado pelo arquiteto (Gemini CLI) é injetado na pasta de textos e enviado via rclone.

### Passo 2: Processamento de IA (Colab)
O Google Colab utiliza sua GPU (T4/A100) para tarefas pesadas que não poluem o ambiente local:
1. Síntese de Voz (Kokoro TTS): Transforma o roteiro em locução profissional.
2. Alinhamento Temporal (WhisperX): Gera metadados de sincronia palavra-por-palavra (Word-Level Timestamps).
3. Escrita: Salva o .wav e o .json na pasta /audio_ready do Drive.

### Passo 3: Importação (Cloud -> Local)
O agente local puxa os ativos masterizados para a fábrica.

## 4. Benefícios desta Arquitetura
- Escalabilidade: Permite produzir vídeos longos (12 min+) sem sobrecarregar a CPU/GPU local com tarefas de IA.
- Desacoplamento: Se o Colab cair, o renderer visual local continua funcional. Se a internet cair, o progresso já sincronizado está salvo.
- Isolamento de Dependências: Não há necessidade de instalar bibliotecas de IA pesadas no ambiente de produção do renderizador Rust.

## 5. Scripts de Orquestração
O sistema utiliza o rclone para sincronizar as pastas de forma incremental, garantindo que apenas arquivos novos ou alterados sejam transferidos.
