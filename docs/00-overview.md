# 00-overview

Usare questo file come mappa mentale prima di iniziare a scrivere codice.

## Logica base

Il flusso parte sempre dalla traccia:

```text
traccia
  -> obiettivo        | cosa devo ottenere
  -> input/output     | cosa entra e cosa deve uscire
  -> vincoli          | tempo, stack, persistenza, casi limite
  -> rischi           | duplicati, retry, stati invalidi, fallimenti
```

Poi trasformo il problema in un design minimo:

```text
endpoint / trigger
  -> handler          | valida e traduce la richiesta
  -> service          | contiene le regole di business
  -> repository       | legge e scrive i dati
  -> response/event   | restituisce un esito coerente
```

## Ordine di ragionamento

1. Capisco il percorso principale: richiesta valida, dati corretti, risposta attesa.
2. Identifico dove il flusso puo' rompersi: input invalido, risorsa assente, stato non valido.
3. Decido come gestire duplicati e retry prima di introdurre side effect.
4. Scelgo una persistenza semplice e una fonte di verita' chiara.
5. Implemento prima il flusso funzionante, poi robustezza e casi negativi.

## Frase guida

"Parto dal flusso piu' semplice che soddisfa la traccia, poi aggiungo protezioni nei punti in cui possono nascere duplicati, stati inconsistenti o errori."

## Collegamento con gli altri file

- `01-spec.md`: cosa devo costruire.
- `02-decisions.md`: perche' ho scelto questa soluzione.
- `03-plan.md`: in che ordine lavoro.
- `04-flow.md`: flow chart con rettangoli, decisioni, frecce e note da spiegare.
- `05-notes.md`: cosa resta fuori o migliorerei dopo.
