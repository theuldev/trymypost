import type { TranslationDict } from "@/i18n";

export const storageDict: TranslationDict = {
  "pt-BR": {
    "storage.title": "Armazenamento",
    "storage.subtitle":
      "Base de conhecimento (RAG): documentos que enriquecem a geração de posts com informações da sua empresa/projetos.",
    "storage.status.available": "Base de conhecimento ativa",
    "storage.status.unavailable": "Base de conhecimento indisponível",
    "storage.status.hint":
      "Inicie o serviço pgvector com 'docker compose up vectordb' e verifique o .env (VECTOR_DATABASE_URL, GOOGLE_EMBEDDING_MODEL).",
    "storage.status.model": "Modelo de embedding: {model} (dim {dim})",

    "storage.add.title": "Adicionar documento",
    "storage.add.subtitle": "Cole um texto ou envie um arquivo .txt, .md, .pdf ou .docx.",
    "storage.add.titleLabel": "Título",
    "storage.add.titlePlaceholder": "ex.: Sobre a minha empresa",
    "storage.add.contentLabel": "Conteúdo",
    "storage.add.contentPlaceholder":
      "Cole aqui informações sobre sua empresa, produtos, equipe, estudos de caso...",
    "storage.add.fileLabel": "Ou envie um arquivo (.txt, .md, .pdf, .docx)",
    "storage.add.submit": "Indexar documento",
    "storage.add.indexing": "Indexando...",

    "storage.list.title": "Documentos indexados",
    "storage.list.empty": "Nenhum documento ainda. Adicione o primeiro acima.",
    "storage.list.chunks": "{count} chunks",
    "storage.list.addedAt": "Adicionado em {date}",

    "storage.delete.title": "Excluir documento",
    "storage.delete.description": "Este documento sairá da base de conhecimento.",
    "storage.delete.confirm": "Excluir \"{title}\"?",
    "storage.delete.cancel": "Cancelar",
    "storage.delete.confirmButton": "Excluir",

    "storage.toast.added": "Documento indexado com sucesso!",
    "storage.toast.addError": "Erro ao indexar documento",
    "storage.toast.deleted": "Documento removido",
    "storage.toast.deleteError": "Erro ao remover documento",

    "storage.settings.title": "Configurações de RAG",
    "storage.settings.subtitle":
      "Ajustes da indexação (valem para novos documentos) e da recuperação (valem na hora).",
    "storage.settings.chunkSize": "Tamanho do chunk (chars)",
    "storage.settings.chunkOverlap": "Overlap entre chunks (chars)",
    "storage.settings.topK": "Chunks recuperados (top-k)",
    "storage.settings.minScore": "Score mínimo (0.0–1.0)",
    "storage.settings.rerank": "Reranking com LLM",
    "storage.settings.rerankDesc":
      "Busca 3x mais chunks e reordena por relevância usando o modelo de IA (custo extra por geração).",
    "storage.settings.save": "Salvar configurações",
    "storage.toast.settingsSaved": "Configurações de RAG salvas!",
    "storage.toast.settingsError": "Erro ao salvar configurações de RAG",
  },
  "en-US": {
    "storage.title": "Storage",
    "storage.subtitle":
      "Knowledge base (RAG): documents that enrich post generation with information about your company/projects.",
    "storage.status.available": "Knowledge base is active",
    "storage.status.unavailable": "Knowledge base unavailable",
    "storage.status.hint":
      "Start the pgvector service with 'docker compose up vectordb' and check the .env (VECTOR_DATABASE_URL, GOOGLE_EMBEDDING_MODEL).",
    "storage.status.model": "Embedding model: {model} (dim {dim})",

    "storage.add.title": "Add document",
    "storage.add.subtitle": "Paste text or upload a .txt, .md, .pdf or .docx file.",
    "storage.add.titleLabel": "Title",
    "storage.add.titlePlaceholder": "e.g. About my company",
    "storage.add.contentLabel": "Content",
    "storage.add.contentPlaceholder":
      "Paste information about your company, products, team, case studies...",
    "storage.add.fileLabel": "Or upload a file (.txt, .md, .pdf, .docx)",
    "storage.add.submit": "Index document",
    "storage.add.indexing": "Indexing...",

    "storage.list.title": "Indexed documents",
    "storage.list.empty": "No documents yet. Add the first one above.",
    "storage.list.chunks": "{count} chunks",
    "storage.list.addedAt": "Added on {date}",

    "storage.delete.title": "Delete document",
    "storage.delete.description": "This document will leave the knowledge base.",
    "storage.delete.confirm": "Delete \"{title}\"?",
    "storage.delete.cancel": "Cancel",
    "storage.delete.confirmButton": "Delete",

    "storage.toast.added": "Document indexed successfully!",
    "storage.toast.addError": "Error indexing document",
    "storage.toast.deleted": "Document removed",
    "storage.toast.deleteError": "Error removing document",

    "storage.settings.title": "RAG settings",
    "storage.settings.subtitle":
      "Indexing settings (apply to new documents) and retrieval settings (apply at query time).",
    "storage.settings.chunkSize": "Chunk size (chars)",
    "storage.settings.chunkOverlap": "Chunk overlap (chars)",
    "storage.settings.topK": "Retrieved chunks (top-k)",
    "storage.settings.minScore": "Minimum score (0.0–1.0)",
    "storage.settings.rerank": "LLM reranking",
    "storage.settings.rerankDesc":
      "Fetches 3x more chunks and reorders them by relevance using the AI model (extra cost per generation).",
    "storage.settings.save": "Save settings",
    "storage.toast.settingsSaved": "RAG settings saved!",
    "storage.toast.settingsError": "Error saving RAG settings",
  },
};
