````markdown
# MoWave Backend

This is the backend API for the MoWave hotspot and voucher management system. It is built using Node.js and Express, with PostgreSQL as the database.

## Features

- User authentication and authorization
- Voucher generation and management
- Payment tracking and aggregation
- Hotspot user management
- Integration with mobile money payment via Ssentezo API
- SMS notifications via Ego SMS API
- API endpoints for frontend consumption
- Basic logging and error handling

## Requirements

- Node.js (v16 or above recommended)
- PostgreSQL
- npm or yarn

## Setup

1. Clone the repository

```bash
git clone https://github.com/jessebyarugaba/mowave-backend.git
cd mowave-backend
````

2. Install dependencies

```bash
npm install
```

3. Create a `.env` file at the root and configure environment variables:

```env
PORT=5000

DATABASE_URL=postgresql://postgres:passwordhere@localhost:5432/mowave_db
JWT_SECRET=secrethere

# Ego SMS API credentials
EGO_SMS_USERNAME=usernamehere
EGO_SMS_PASSWORD=passwordhere
EGO_SMS_SENDERNAME=sendernamehere

# Ssentezo mobile money API credentials
SSENTEZO_USER=userkeyhere
SSENTEZO_KEY=secretkeyhere
```

4. Run database migrations (if applicable)

```bash
npm run migrate
```

5. Start the server

```bash
npm start
```

The backend will be available at `http://localhost:5000`.

## External API Integrations

* **Ssentezo API**: Used for handling mobile money payments and transactions.
* **Ego SMS API**: Used for sending SMS notifications such as voucher codes and alerts.

## Development

* Use `npm run dev` to start the server with hot reload using nodemon.
* Tests (if any) can be run via `npm test`.

## License

MIT