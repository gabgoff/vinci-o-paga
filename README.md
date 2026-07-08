# Vinci o Paga

Gioco a eliminazione ("last man standing") sulla Serie A. Ogni giornata scegli una
squadra che pensi vincerà: se vince passi al turno successivo, se pareggia o perde sei
eliminato. Non puoi scegliere la stessa squadra due volte nella competizione. Vince
l'ultimo partecipante rimasto (o i vincitori a pari merito, se restano eliminati tutti
insieme nello stesso turno), dividendosi il montepremi della lega.

Gli utenti si registrano, pagano una quota d'iscrizione e giocano nella lega pubblica o
in una lega privata creata da un host (con codice invito).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Prisma 7 (driver adapter `@prisma/adapter-pg`)
- Autenticazione custom con sessione JWT firmata (cookie httpOnly), password con bcrypt
- Risultati Serie A: `API_FOOTBALL_KEY` (api-sports.io) se configurata, altrimenti dati
  demo seedati (`lib/sports/demo-seed.ts`) così l'app è testabile senza credenziali
- Pagamenti: provider **simulato** (`lib/payments/mock.ts`) dietro un'interfaccia
  `PaymentProvider`, pronto per essere sostituito da Stripe/PayPal in futuro

## Setup locale

```bash
cp .env.example .env   # imposta DATABASE_URL e AUTH_SECRET
npm install
npx prisma migrate dev
npx prisma db seed      # crea squadre Serie A demo, 3 giornate, lega pubblica, utente admin
npm run dev
```

Utente amministratore demo creato dal seed: `admin@vinciopaga.demo` / `admin1234`.

Per abilitare i risultati live invece dei dati demo, imposta `API_FOOTBALL_KEY` in `.env`
(chiave api-sports.io, piano Serie A / league id 135).

## Test

```bash
npm run lint
npx tsc --noEmit
npx vitest run     # test unitari della logica di gioco (lib/engine.ts)
npm run build
```

## Note legali

I pagamenti in questa versione sono **simulati**: nessun addebito reale avviene. Un
montepremi alimentato da denaro reale può ricadere sotto la normativa italiana sui
giochi a pronostico (ADM): da verificare legalmente prima di un lancio con soldi veri.
