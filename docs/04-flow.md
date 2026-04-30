# 04-flow

```text
Request
  -> classify request
      -> debug forced?        -> markdown flow
      -> AI crawler detected? -> markdown flow
      -> normal client        -> fetch origin and pass-through

Markdown flow
  -> fetch origin page
  -> if response is not HTML: pass-through
  -> extract metadata
  -> strip noisy HTML
  -> convert relevant content to markdown
  -> return text/markdown
```

Note da spiegare:
- La classificazione e' prioritizzata per rendere prevedibile il comportamento.
- La rotta `/llms` e `?debug=llm` serve a testare senza simulare user-agent.
- Non c'e' stato applicativo: retry e richieste duplicate sono sicuri.
