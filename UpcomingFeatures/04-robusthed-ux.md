# Robusthed & UX

| Feature | Beskrivelse | Sværhedsgrad |
|---------|-------------|--------------|
| **Fejlnotifikationer** | API-fejl sluges stille — brugeren ved ikke at submit fejlede. Toast/snackbar mangler. | Lav |
| **Offline-indikator** | Ingen besked hvis nettet forsvinder — polling fejler bare stille. | Lav |
| **Bekræft ved forlad side** | Ingen "Er du sikker?" dialog hvis man navigerer væk midt i et spil. | Lav |
| **Oprydning af gamle rum** | Rum og spillere slettes aldrig fra databasen — vil vokse uendeligt. | Mellem |
| **Rate limiting** | Ingen beskyttelse mod API-misbrug. | Mellem |
| **Upload størrelsesbegrænsning** | Tegninger har ingen max-filstørrelse. | Lav |
| **Lyd-effekter** | Ingen lyd overhovedet — en "ding" ved rundeskift eller timer-advarsel ville hjælpe. | Lav |
