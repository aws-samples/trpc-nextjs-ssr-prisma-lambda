# Frontend
This is a Next.js app with Prisma, tRPC, React Hook Form, etc.

## Local development
First you need to start a local MySQL server:

```sh
docker compose up
```

The parameters required for a database is in [`prisma/.env`](prisma/.env). It should work by default.

You can now create a database and some tables with Prisma. Run the following command:

```sh
npm ci # Install dependencies. You only need this once.
npx prisma db push
```

Then you can start a local server by the following command:

```sh
npm run dev
```

Finally open the URL shown in the terminal (e.g. `http://localhost:3000` ). 

You can now see the webapp frontend. Change some code, and it will be hot-reloaded.
