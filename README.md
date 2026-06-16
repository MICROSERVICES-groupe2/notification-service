# Bank Platform — Notifications Service

Ce microservice gère la distribution de notifications multicanales (Email, SMS, Push FCM, In-App WebSockets) pour la plateforme bancaire.

## Spécifications & Technologies
*   **Port :** `8087`
*   **Technologies :** Node.js 20 LTS, Express, Socket.io, KafkaJS, Handlebars
*   **Santé du service :** `GET http://localhost:8087/health` (doit retourner `{"status":"UP"}`)

## Structure du Projet
```text
notifications-service/
├── docker/                 # Configurations Docker (Dockerfile & Compose)
├── src/
│   ├── app.js              # Configuration Express
│   ├── server.js           # Serveur HTTP, Socket.io & Consumer Kafka
│   ├── adapters/           # Connecteurs Email, SMS, Push, In-App
│   ├── consumers/          # Consumer KafkaJS
│   ├── services/           # Moteur de rendu des templates Handlebars
│   ├── templates/          # Templates de notifications (.hbs)
│   └── config/             # Fichiers de configuration env / Firebase
└── tests/                  # Suite de tests (Jest)
```

## Démarrage rapide

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration (`.env`)
Créez un fichier `.env` à la racine (les clés manquantes basculent automatiquement sur des simulateurs locaux/console en dev) :
```bash
cp .env.example .env
```

### 3. Lancement local
```bash
npm run dev
```

### 4. Lancement via Docker Compose (avec Kafka/Zookeeper inclus)
```bash
docker compose -f docker/docker-compose.yml up --build -d
```