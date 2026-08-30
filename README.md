# Gemini Reflection Journal

A secure, user-authenticated personal reflection and journaling web application powered by **Gemini 3.6 Flash** and **Cloud Firestore**.

## 🌟 Features

- **Google Federated Authentication**: Secure login via Firebase Auth (Google Sign-In Popup) without storing user passwords.
- **Multi-Turn AI Reflections**: Converse with Gemini across multiple modes:
  - *Reflect & Inquire*: Empathetic perspective with guiding questions.
  - *Summarize & Themes*: Crisp distillations, emotional pulse, and key takeaway patterns.
  - *Brainstorm & Expand*: Creative reframing and alternative viewpoints.
  - *Actionable Steps*: Tangible micro-habits and pragmatic action items.
- **Strict User-Isolation in Firestore**: Every journal interaction and reflection thread is strictly isolated to `/users/{userId}/interactions/{interactionId}`.
- **Resilient AI Fallback Ladder**: Built-in fallback chain (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`) with error status recovery.
- **Smart Metadata Engine**: Automatic title and tag suggestions generated using Gemini.
- **Full History & Search**: Instant keyword search, reflection mode filtering, and tag exploration.

---

## 🔒 Security Architecture & Firestore Rules

### Firestore Security Rules (`firestore.rules`)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User root profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // User-isolated journal interactions
      match /interactions/{interactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🚀 Google Cloud Secret Manager & Deployment

### 1. Enable Required Cloud Services
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  aiplatform.googleapis.com
```

### 2. Configure Secret Manager for Gemini API Key
```bash
# Create the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"

# Populate the secret value
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy to Google Cloud Run
```bash
gcloud run deploy gemini-reflection-journal \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

### 4. Apply Mandatory Campaign Verification Label
```bash
gcloud run services update gemini-reflection-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
