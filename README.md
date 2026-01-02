# Learning App

An AI-powered learning app with spaced repetition flashcards. Explore topics through AI-generated content, save flashcards, and review them using spaced repetition.

## Features

- **Learn Screen**: Explore topics with AI-generated content
  - Go deeper into current topic
  - Take tangents to related topics
  - Save content as flashcards automatically
- **Review Screen**: Spaced repetition flashcard review
  - Rate difficulty (Easy: 7 days, Medium: 3 days, Hard: 1 day)
  - Only shows cards due today
- **Card Library**: Browse all saved flashcards
- **Progress Tracking**: See cards due today and total cards saved

## Tech Stack

- React 19 + Vite
- Tailwind CSS 4
- Anthropic Claude API (Haiku model)
- LocalStorage for data persistence

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/scwilson26/learning-app.git
cd learning-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` and add your Anthropic API key:
```
VITE_ANTHROPIC_API_KEY=your_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Deployment to Vercel

### Step 1: Prepare Your Repository

Make sure all your changes are committed and pushed to GitHub:
```bash
git add .
git commit -m "Prepare for deployment"
git push
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login (use your GitHub account)

2. Click "Add New Project"

3. Import your GitHub repository (`scwilson26/learning-app`)

4. Configure the project:
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (should auto-fill)
   - **Output Directory**: `dist` (should auto-fill)

5. **Add Environment Variable**:
   - Click "Environment Variables"
   - Add: `VITE_ANTHROPIC_API_KEY` = `your_api_key_here`
   - Make sure to use the same API key from your `.env` file

6. Click "Deploy"

### Step 3: Access Your App

- Vercel will provide a URL like `https://learning-app-abc123.vercel.app`
- Your app is now live and accessible from any device!
- The URL will work on mobile browsers

### Updating Your Deployment

Every time you push to the `main` branch on GitHub, Vercel will automatically rebuild and redeploy your app.

```bash
git add .
git commit -m "Update feature"
git push
```

## Mobile Access

The app is fully responsive and works on mobile browsers. Simply:
1. Open the Vercel URL on your phone's browser
2. (Optional) Add to home screen for app-like experience:
   - **iOS**: Safari → Share → Add to Home Screen
   - **Android**: Chrome → Menu → Add to Home Screen

## Environment Variables

- `VITE_ANTHROPIC_API_KEY`: Your Anthropic API key for Claude AI

**Security Note**: The API key is exposed in the browser. For production use, consider setting up a backend proxy to keep the API key secure.

## License

MIT
