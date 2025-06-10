1. Create the MongodBB
2. Put the connection string in .env

```
MONGODB_URL=<full>
MONGODB_DB=aiautomation
```

3. Build just the db setup part as it is in typescript ``npm run build:db``
4. Then run ``npm scripts/setup-db.js``. This will setup all tables and indexes required.

5. Continue with your normal devlopment post this ``npm run dev``.