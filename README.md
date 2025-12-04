<div align="center">
  <h1>K&L Recycling CRM</h1>
  <p>A React-based CRM application for managing recycling business prospects and outreach.</p>
</div>

## Features

- Dashboard with key metrics and pipeline visualization
- Prospect management with priority scoring
- Interactive map view using Leaflet
- Smart daily route planning
- Task management system
- Outreach logging with contact history
- CSV import/export functionality
- Responsive design with Tailwind CSS

## Run Locally

**Prerequisites:** Node.js 16+ and npm

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deploy to GitHub Pages

This project is configured for deployment to GitHub Pages from the `docs/` folder.

### Manual Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. This creates a `docs/` folder with the built files.

3. Commit and push the `docs/` folder to your GitHub repository.

4. In your GitHub repository settings:
   - Go to Settings > Pages
   - Set Source to "Deploy from a branch"
   - Set Branch to `main` and folder to `/docs`
   - Save

Your site will be available at `https://[username].github.io/[repository-name]/`

### Automatic Deployment (GitHub Actions)

Create a `.github/workflows/deploy.yml` file in your repository:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout
      uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 18
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build
      run: npm run build

    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      if: github.ref == 'refs/heads/main'
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./docs
```

## Tech Stack

- **Frontend:** React 18, TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Maps:** Leaflet
- **Icons:** Lucide React
