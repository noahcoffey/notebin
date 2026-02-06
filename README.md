# noteb.in

A markdown note-taking app with wiki-style linking, built for the web.

## Features

- **Milkdown Editor** - WYSIWYG markdown editing with GitHub Flavored Markdown support
- **Wiki Links** - Link notes together with `[[note name]]` syntax
- **Task Lists** - Clickable checkboxes with `Ctrl+Shift+T` to convert lines to tasks
- **Graph View** - Visualize connections between your notes
- **Public Sharing** - Share individual notes via public links
- **Authentication** - Email/password auth via Supabase
- **Dark Theme** - Easy on the eyes

## Tech Stack

- React 18 + TypeScript
- Vite
- Milkdown (ProseMirror-based editor)
- Supabase (PostgreSQL + Auth)
- Tailwind CSS
- Zustand (state management)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/noahcoffey/notebin.git
cd notebin
npm install
```

### 2. Configure Supabase

Create a project at [supabase.com](https://supabase.com), then:

1. Run the schema in SQL Editor:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

2. Enable Email auth in Authentication → Providers

3. Create `.env` with your credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

### 3. Run locally

```bash
npm run dev
```

### 4. Build for production

```bash
npm run build
```

Upload the `dist/` folder to your web server.

## License

MIT
