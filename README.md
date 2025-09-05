# SocialConnect (Next.js + Supabase)

A complete social media platform built with Next.js and Supabase. Features include user authentication, posts, likes, comments, follows, notifications, and admin functionality.

## 🚀 Features

- **User Authentication**: Register, login, and profile management
- **Social Feed**: Create and view posts with images
- **Interactions**: Like, comment, and follow other users
- **Real-time Notifications**: Get notified of likes, comments, and follows
- **Admin Panel**: Manage users and content
- **Responsive Design**: Works on all devices
- **Image Upload**: Support for post images and profile avatars

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with triggers and RLS
- **Real-time**: Supabase Realtime

## 📋 Prerequisites

- Node.js 18+
- A Supabase project
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/vivekVSH/socialconnect.git
cd socialconnect
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new Supabase project
2. Go to Settings > API and copy your project URL and anon key
3. Create Storage buckets:
   - `post-images` (public)
   - `avatars` (public)
4. Enable Realtime for the `public` schema

### 4. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 5. Database Setup

Run the SQL migrations in your Supabase SQL editor:

1. Start with `supabase_schema.sql` for the main schema
2. Run any additional migrations from the `migrations/` folder as needed

### 6. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── (auth)/            # Authentication pages
│   └── ...                # Other pages
├── components/            # React components
├── lib/                   # Utility functions
├── migrations/            # Database migrations
└── public/               # Static assets
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📚 Documentation

- [Quick Setup Guide](QUICK_SETUP.md)
- [Environment Setup](SETUP_ENV.md)
- [Storage Setup](STORAGE_SETUP.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

If you encounter any issues, please check the documentation or create an issue on GitHub.
