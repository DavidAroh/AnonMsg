# AnonMsg - Anonymous Messaging Platform

A fully-featured anonymous messaging platform with media support, inspired by ngl.link. Users can create shareable profile links to receive anonymous text messages, images, and videos.

## Features

### Core Functionality
- **Anonymous Messaging** - Send and receive completely anonymous messages
- **Media Support** - Upload images (up to 10MB) and videos (up to 50MB)
- **Unique Handles** - Claim your unique username (e.g., anonmsg.link/yourname)
- **Secure Dashboard** - View and manage all received messages
- **Real-time Updates** - Messages appear instantly in your dashboard

### Privacy & Security
- **Row Level Security (RLS)** - Database-level access control
- **IP Hash Protection** - Only hashed IPs stored, never raw addresses
- **Rate Limiting** - Built-in abuse prevention
- **Auto-Expiration** - Messages auto-delete after 30 days
- **Moderation Ready** - Prepared for content moderation workflows
- **Reporting System** - Users can report abusive content

### User Experience
- **Beautiful UI** - Modern, responsive design with Tailwind CSS
- **Profile Customization** - Display name, bio, avatar support
- **Message Filtering** - Filter by unread, media-only
- **Settings Control** - Toggle message acceptance, media uploads
- **Copy Link** - One-click link sharing

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth (Email/Password)
- **Icons**: Lucide React
- **Routing**: React Router v6

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd anonmsg
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
The `.env` file should already contain your Supabase credentials:
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Database Setup

1. Visit the setup page at `/db-setup` after starting the dev server
2. Copy the provided SQL migration
3. Go to your Supabase SQL Editor
4. Paste and run the migration

OR manually run the migration from `supabase/migrations/20250101000000_initial_schema.sql`

### Storage Setup

1. Go to your Supabase Dashboard > Storage
2. Create a new bucket named `message-media`
3. Make it **Public**
4. Save the bucket

### Run the Application

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
src/
├── contexts/
│   └── AuthContext.tsx       # Authentication state management
├── lib/
│   ├── supabase.ts           # Supabase client and types
│   └── utils.ts              # Utility functions
├── pages/
│   ├── Landing.tsx           # Landing page with auth
│   ├── ProfileSetup.tsx      # Handle claiming flow
│   ├── Dashboard.tsx         # Message management
│   ├── Settings.tsx          # Profile settings
│   ├── PublicProfile.tsx     # Public message submission
│   └── Setup.tsx             # Database setup instructions
├── App.tsx                   # Main app with routing
└── main.tsx                  # Entry point

supabase/
└── migrations/
    └── 20250101000000_initial_schema.sql  # Database schema
```

## Database Schema

### Tables

- **profiles** - User profiles with handles
- **messages** - Anonymous messages
- **message_media** - Media attachments (images/videos)
- **reports** - User reports for abusive content
- **rate_limits** - Rate limiting tracking

All tables have Row Level Security (RLS) enabled with appropriate policies.

## Usage

### For Profile Owners

1. Sign up with email and password
2. Claim your unique handle
3. Share your link (e.g., yourapp.com/username)
4. View messages in your dashboard
5. Manage settings and delete messages

### For Message Senders

1. Visit someone's profile link
2. Type a message (optional)
3. Attach images or videos (optional)
4. Send anonymously
5. No account required

## Security Features

### Rate Limiting
- Client-side rate limiting prevents spam
- 5 messages per IP per minute
- Automatic cooldown with visual feedback

### Data Protection
- All sensitive data encrypted
- IP addresses are hashed with SHA-256
- Row Level Security on all tables
- Secure file uploads with Supabase Storage

### Content Moderation
- Messages have moderation status field
- Can be set to require approval
- Reporting system for abusive content
- Easy integration with AI moderation APIs

## Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Deploy to Vercel/Netlify

1. Connect your repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Environment Variables in Production

Make sure to set these in your deployment platform:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Future Enhancements

- Push notifications for new messages
- Video processing and thumbnails
- Advanced moderation with AI
- Email notifications
- Analytics dashboard
- Premium features
- Social sharing features
- Message reactions
- Reply system (authenticated)
- Mobile apps

## License

MIT License - feel free to use this for your own projects!

## Support

For issues and questions, please open an issue on GitHub.

---

Built with React, TypeScript, Tailwind CSS, and Supabase.
