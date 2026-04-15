# OpenClaw Mission Control

Lokalny dashboard dla [OpenClaw](https://openclaw.ai/) — self-hosted AI assistant platform. Interfejs webowy do zarządzania agentem, prowadzenia rozmów i zarządzania kalendarzem.

![Stack](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![Stack](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript) ![Stack](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss) ![Stack](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker)

---

## Funkcje

### Dashboard
- Zegar na żywo z datą (PL)
- Status połączenia z OpenClaw gateway (zielony / żółty / czerwony)
- Licznik wiadomości w bieżącej sesji

### Chat
- Bezpośredni czat z agentem OpenClaw przez WebSocket
- Obsługa streamingu odpowiedzi (token po tokenie)
- Auto-reconnect z exponential backoff (1s → 2s → 4s → max 30s)
- Heartbeat co 30 sekund

### Kalendarz
- Widok miesięczny z nawigacją
- Dodawanie i usuwanie eventów
- Eventy zapisywane jako pliki `.md` z YAML frontmatter
- Pliki dostępne bezpośrednio dla OpenClaw w jego workspace (`~/.openclaw/workspace/calendar/`)
- OpenClaw może samodzielnie dodawać eventy przez REST API (`POST /api/events`)

---

## Stack technologiczny

| Warstwa | Technologia |
|---|---|
| Frontend | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS (dark mode) |
| State | Zustand |
| Backend | Express.js |
| Kalendarz storage | Pliki Markdown (.md) + gray-matter |
| Konteneryzacja | Docker + docker-compose |

---

## Wymagania

- Docker z obsługą `network_mode: host` (Linux)
- OpenClaw zainstalowany na tym samym hoście
- OpenClaw gateway nasłuchujący na porcie `18789`

---

## Instalacja

### 1. Klonuj repozytorium

```bash
git clone https://github.com/poncheck/miszon.git
cd miszon
```

### 2. Utwórz katalog na eventy kalendarza

```bash
mkdir -p ~/.openclaw/workspace/calendar
```

### 3. Skonfiguruj zmienne środowiskowe

Edytuj `docker-compose.yml` i ustaw:

```yaml
environment:
  - WS_URL=ws://localhost:18789        # adres OpenClaw gateway
  - WS_TOKEN=TWÓJ_TOKEN_GATEWAY        # token z ~/.openclaw/openclaw.json
  - PORT=3000
```

Token znajdziesz w `~/.openclaw/openclaw.json` w sekcji `gateway.auth.token`.

### 4. Dodaj origin Mission Control do OpenClaw

W `~/.openclaw/openclaw.json` w sekcji `gateway.controlUi`:

```json
"controlUi": {
  "allowInsecureAuth": true,
  "allowedOrigins": [
    "https://claw.poncheck.cloud",
    "http://TWOJE_IP:3000"
  ]
}
```

Zrestartuj OpenClaw po zmianie.

### 5. Uruchom

```bash
docker compose up --build -d
```

Dashboard dostępny na `http://TWOJE_IP:3000`

---

## Format plików kalendarza

Każdy event to osobny plik `.md` w `~/.openclaw/workspace/calendar/`:

```markdown
---
id: abc123xyz
title: Spotkanie z klientem
date: 2026-04-15
start_time: "14:00"
end_time: "15:00"
color: cyan
source: user
created_at: "2026-04-15T10:00:00.000Z"
---
Omówienie projektu X, przygotować demo.
```

**Wartości `source`:**
- `user` — dodane przez użytkownika w UI
- `openclaw` — dodane przez agenta AI

---

## API kalendarza

OpenClaw może zapisywać eventy przez REST API:

```bash
# Dodaj event
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Przypomnienie",
    "date": "2026-04-20",
    "start_time": "09:00",
    "description": "Zadzwonić do klienta",
    "source": "openclaw"
  }'

# Pobierz eventy na miesiąc
curl http://localhost:3000/api/events?month=2026-04

# Usuń event
curl -X DELETE http://localhost:3000/api/events/EVENT_ID
```

---

## Struktura projektu

```
miszon/
├── docker-compose.yml
├── Dockerfile
├── server/
│   ├── index.ts              # Express: API + static SPA + /config.js
│   ├── eventsStore.ts        # Odczyt/zapis plików .md
│   └── routes/
│       └── events.ts         # CRUD /api/events
└── src/
    ├── App.tsx               # Router zakładek
    ├── store/
    │   └── gatewayStore.ts   # Zustand: WS state + wiadomości
    ├── hooks/
    │   ├── useGatewaySocket.ts  # WebSocket lifecycle + reconnect
    │   ├── useCalendarEvents.ts
    │   └── useClock.ts
    ├── pages/
    │   ├── DashboardPage.tsx
    │   ├── ChatPage.tsx
    │   └── CalendarPage.tsx
    └── components/
        ├── layout/           # Sidebar, StatusBar
        ├── dashboard/        # ClockWidget, GatewayStatus
        ├── chat/             # ChatWindow, MessageBubble
        └── calendar/         # CalendarGrid, EventModal
```

---

## Status projektu

> ⚠️ **W trakcie rozwoju** — połączenie z OpenClaw gateway wymaga jeszcze dopracowania protokołu autoryzacji (device pairing). Kalendarz i UI działają w pełni.

- [x] Dashboard z zegarem i statusem gateway
- [x] Kalendarz z plikami .md
- [x] REST API dla OpenClaw
- [x] Docker na Linuxie (`network_mode: host`)
- [ ] Pełna autoryzacja WebSocket (device pairing)
- [ ] Streaming odpowiedzi z agenta
- [ ] Historia rozmów
