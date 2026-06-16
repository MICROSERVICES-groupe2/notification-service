# Notifications Service — bank-platform-notifications

Ce microservice gère la diffusion de notifications sur plusieurs canaux en temps réel (E-mail, SMS, notifications Push mobiles, et notifications In-App interactives). Il peut être déclenché directement ou en consommant des événements depuis des topics Kafka.

---

## 🛠️ Stack Technique

* **Runtime** : Node.js 20 LTS
* **Serveur Web & Sockets** : Express, Socket.io (liaison en temps réel avec clients connectés)
* **Messagerie événementielle** : KafkaJS (Topics: `notifications.send`, `transactions.created`, `loans.requested`)
* **Moteur de templates** : Handlebars
* **Fournisseurs Externes** :
  * **Email** : Nodemailer (Dev/Local) et SendGrid (Production)
  * **SMS** : Console simulation (Dev) et Twilio (Production)
  * **Push** : Firebase Admin SDK (avec simulation de test si clés absentes)
  * **In-App** : Socket.io Rooms (`user:{userId}`) avec sauvegarde hors-ligne en mémoire RAM.
* **Sécurité & Observabilité** : Helmet, Cors, Prometheus Client (`prom-client`), OpenTelemetry

---

## 🔌 API REST & Socket.io

Le service écoute sur le port **8087** et expose :

### Routes HTTP :
* **`GET /health`** : Vérification de l'état de santé du service (retourne `{"status":"UP"}`).
* **`GET /metrics`** : Métriques au format Prometheus pour monitoring.

### Sockets (Socket.io) :
* Les clients se connectent via : `ws://localhost:8087?userId={id}`.
* Le client rejoint automatiquement la room `user:{userId}`.
* Si l'utilisateur est hors-ligne, les notifications in-app sont sauvegardées temporairement en mémoire et lui sont diffusées dès qu'il se reconnecte (événement `offline-notifications`).

---

## 📝 Templates Supportés (Handlebars)

Les messages sont formatés de façon dynamique à l'aide de templates situés dans `src/templates/` :
1. **`transaction_confirmed.hbs`** : Notifications de dépôt ou retrait.
2. **`transfer_completed.hbs`** : Notifications de virements émis.
3. **`loan_approved.hbs`** : Notifications d'acceptation de demandes de crédit.
4. **`loan_rejected.hbs`** : Notifications de refus de crédit.
5. **`welcome.hbs`** : E-mail de bienvenue lors de la création d'un compte client.

---

## 🚀 Guide d'Exécution rapide

### 1. Installer les dépendances
Ouvrez le terminal dans le dossier et lancez :
```bash
npm install
```
*(Sur Windows, si les politiques PowerShell bloquent le script d'installation, exécutez `cmd.exe /c npm install`)*

### 2. Lancer les tests automatisés
Pour lancer la suite complète de tests (avec mocks automatiques des fournisseurs tiers) :
```bash
npm test
```

### 3. Démarrer avec Docker Compose
Pour lancer le service de notifications connecté à une infrastructure locale Kafka et Zookeeper :
```powershell
cd docker
docker compose up --build
```
 Le service de notifications démarrera sur le port **8087**.