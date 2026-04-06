# Tekniske forbedringer

| Feature | Beskrivelse | Sværhedsgrad |
|---------|-------------|--------------|
| **WebSocket i stedet for polling** | 2s polling giver forsinkelse og unødvendig trafik. WebSocket ville give instant updates. | Høj |
| **Tests** | Playwright er installeret men ingen tests eksisterer. Ingen unit tests. | Mellem |
| **Struktureret logging** | Backend har ingen reel logging — svært at debugge i produktion. | Lav |
| **PWA-support** | Kan ikke installeres som app på mobil. | Mellem |
