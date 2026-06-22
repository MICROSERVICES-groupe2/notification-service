# Notifications Service — Plan d'Implémentation Complet

**Service :** bank-platform-notifications  
**Port :** 8087  
**Langage :** Node.js 20 LTS / Express  
**Phases plan :** P2.16 → P2.20

---

## Table des Matières

1. [T1 — Initialisation](#t1--initialisation)
2. [T2 — Adapters Multi-Canaux](#t2--adapters-multi-canaux)
3. [T3 — Consumer Kafka](#t3--consumer-kafka)
4. [T4 — Templates Handlebars](#t4--templates-handlebars)
5. [T5 — Tests + Dockerisation](#t5--tests--dockerisation)
6. [Ordre d'implémentation recommandé](#ordre-dimplémentation-recommandé)

---

## T1 — Initialisation

> Projet Node.js avec Express et Socket.io

- [ ] Initialiser le projet :
  ```bash
  npm init -y
  npm install express socket.io nodemailer @sendgrid/mail twilio \
              firebase-admin kafkajs handlebars dotenv helmet cors \
              prom-client @opentelemetry/sdk-node @opentelemetry/exporter-otlp-http
  npm install --save-dev jest supertest nodemon eslint
  ```
- [ ] Créer la structure du projet :
  ```
  src/
  ├── app.js
  ├── server.js
  ├── adapters/
  │   ├── adapter.interface.js
  │   ├── email.adapter.js
  │   ├── sms.adapter.js
  │   ├── push.adapter.js
  │   └── inapp.adapter.js
  ├── consumers/
  │   └── kafka.consumer.js
  ├── services/
  │   └── notification.service.js
  ├── templates/
  │   ├── transaction_confirmed.hbs
  │   ├── loan_approved.hbs
  │   ├── loan_rejected.hbs
  │   └── welcome.hbs
  └── config/
      ├── index.js
      └── firebase.js
  ```
- [ ] Configurer `.env` :
  - `PORT=8087`
  - `KAFKA_BOOTSTRAP_SERVERS`, `KAFKA_GROUP_ID=notifications-group`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (dev local)
  - `SENDGRID_API_KEY` (production)
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE`
  - `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`

---

## T2 — Adapters Multi-Canaux

> P2.16 → P2.17 — Pattern Adapter

- [ ] Définir l'interface commune dans `src/adapters/adapter.interface.js` :
  ```javascript
  class NotificationAdapter {
    async send(notification) {
      // notification: { to, subject, body, data }
      throw new Error('Not implemented');
    }
  }
  ```

- [ ] **EmailAdapter** (`src/adapters/email.adapter.js`) :
  - [ ] Dev : utiliser `nodemailer` avec SMTP local (Mailhog ou console transport)
  - [ ] Prod : utiliser `@sendgrid/mail` avec `SENDGRID_API_KEY`
  - [ ] Sélection auto selon `NODE_ENV`
  - [ ] Supporter les templates HTML (passer le HTML rendu par Handlebars)

- [ ] **SMSAdapter** (`src/adapters/sms.adapter.js`) :
  - [ ] Dev : `console.log` simulant l'envoi (pas de coût API)
  - [ ] Prod : `twilio` client → `client.messages.create({to, from, body})`
  - [ ] Sélection auto selon `NODE_ENV`

- [ ] **PushAdapter** (`src/adapters/push.adapter.js`) :
  - [ ] Configurer `firebase-admin` avec les credentials Firebase
  - [ ] Méthode `send(notification)` : appeler `admin.messaging().send({token, notification: {title, body}, data})`
  - [ ] Gérer les tokens FCM invalides (supprimer de la base)

- [ ] **InAppAdapter** (`src/adapters/inapp.adapter.js`) :
  - [ ] Configurer Socket.io dans `server.js`
  - [ ] Chaque utilisateur connecté rejoint une room `user:{userId}`
  - [ ] Méthode `send(notification)` : `io.to('user:' + userId).emit('notification', payload)`
  - [ ] Stocker les notifications non lues en base (Redis ou MongoDB) pour les utilisateurs hors ligne

---

## T3 — Consumer Kafka

> P2.18 — Consommateur KafkaJS

- [ ] Créer `src/consumers/kafka.consumer.js` avec `kafkajs` :
  - Consumer group : `notifications-group`
  - Topics à écouter : `notifications.send`, `transactions.created`, `loans.requested`
- [ ] Router les messages vers le bon adapter selon `notification.channel` :
  ```javascript
  switch (channel) {
    case 'EMAIL': await emailAdapter.send(notification); break;
    case 'SMS':   await smsAdapter.send(notification);   break;
    case 'PUSH':  await pushAdapter.send(notification);  break;
    case 'INAPP': await inappAdapter.send(notification); break;
  }
  ```
- [ ] Gérer les erreurs : logger l'erreur, ne pas crasher le consumer (try/catch par message)
- [ ] Gérer la reconnexion automatique Kafka (retry avec backoff exponentiel)
- [ ] Démarrer le consumer dans l'événement `app.listen` callback

---

## T4 — Templates Handlebars

> P2.19 — Templates par type d'événement

- [ ] Installer et configurer `handlebars` pour le rendu des templates
- [ ] Créer les templates pour chaque type d'événement :

  **`transaction_confirmed.hbs`** :
  ```handlebars
  Bonjour {{name}},
  Votre {{type}} de {{amount}} {{currency}} est confirmé.
  Référence : {{transactionId}}
  Date : {{date}}
  ```

  **`transfer_completed.hbs`** :
  ```handlebars
  Bonjour {{name}},
  Votre transfert de {{amount}} {{currency}} vers {{destination}} est effectué.
  Référence : {{transactionId}}
  ```

  **`loan_approved.hbs`** :
  ```handlebars
  Bonjour {{name}},
  Votre demande de prêt de {{amount}} {{currency}} a été approuvée.
  Première échéance le {{firstPaymentDate}}.
  ```

  **`loan_rejected.hbs`** :
  ```handlebars
  Bonjour {{name}},
  Votre demande de prêt a été refusée. Motif : {{reason}}.
  ```

  **`welcome.hbs`** :
  ```handlebars
  Bienvenue {{name}} sur notre plateforme bancaire !
  Votre compte a été créé avec succès.
  ```

- [ ] Créer `src/services/notification.service.js` :
  - Méthode `render(templateName, data) -> string` : charger et rendre le template Handlebars
  - Méthode `dispatch(event) -> void` : choisir le template, rendre, appeler le bon adapter

---

## T5 — Tests + Dockerisation

> P2.20

- [ ] **Tests Jest** :
  - [ ] `email.adapter.test.js` — mocker `nodemailer`, vérifier que `send()` est appelé avec les bons paramètres
  - [ ] `sms.adapter.test.js` — mocker `twilio`, vérifier l'envoi
  - [ ] `push.adapter.test.js` — mocker `firebase-admin`, vérifier l'appel messaging
  - [ ] `template.test.js` — vérifier le rendu Handlebars pour chaque template
  - [ ] `kafka.consumer.test.js` — mocker KafkaJS, vérifier le routing vers le bon adapter
  - [ ] `notification.service.test.js` — test du dispatch complet

- [ ] **Dockerisation** :
  - [ ] `docker/Dockerfile` :
    ```dockerfile
    FROM node:20-alpine
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci --only=production
    COPY src/ ./src/
    EXPOSE 8087
    CMD ["node", "src/server.js"]
    ```
  - [ ] `docker/docker-compose.yml` : notifications-service + Kafka + ZooKeeper
  - [ ] Tester : `docker compose up` → `GET http://localhost:8087/health`

---

## Ordre d'implémentation recommandé

| # | Tâche | Dépendance | Durée estimée |
|---|-------|------------|---------------|
| 1 | T1 — Initialisation + config | — | 1h |
| 2 | T2 — Interface Adapter | T1 | 30min |
| 3 | T2 — EmailAdapter (dev + prod) | T2 | 1h30 |
| 4 | T2 — SMSAdapter (simulé + Twilio) | T2 | 1h |
| 5 | T2 — PushAdapter (Firebase) | T2 | 1h30 |
| 6 | T2 — InAppAdapter (Socket.io) | T2 | 1h30 |
| 7 | T4 — Templates Handlebars | T1 | 1h |
| 8 | T3 — Consumer Kafka | T2, T4 | 2h |
| 9 | T5 — Tests | Tout | 2h |
| 10 | T5 — Dockerisation | Tout | 1h |

**Durée totale estimée : 3–4 jours** (conforme plan P2.16 → P2.20)

---

## Critères de validation production

- [ ] EmailAdapter envoie correctement (Mailhog en dev, SendGrid en prod)
- [ ] SMSAdapter loggue en dev, envoie via Twilio en prod
- [ ] PushAdapter envoie via Firebase Cloud Messaging
- [ ] InAppAdapter diffuse via Socket.io rooms
- [ ] Consumer Kafka reçoit les messages et route vers le bon canal
- [ ] Templates Handlebars rendus sans erreur
- [ ] `GET /health` retourne `{"status":"UP"}`
- [ ] `docker compose up` démarre sans erreur
