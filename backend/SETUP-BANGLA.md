# HortNet-BD — নিজের পিসিতে চালানো (১০০% লোকাল, ক্লাউড ছাড়া)

এটা তোমার v1-এর পুরো সিস্টেম — সব ফিচার সহ — লোকাল PostgreSQL-এ চলবে।

## একবারের সেটআপ

১) এই ফোল্ডারে Command Prompt খুলে dependencies ইনস্টল করো:
```
npm install
```

২) `.env.example` কপি করে নাম দাও `.env`। ভেতরে:
   - DB password ঠিক আছে কিনা দেখো (postgres / 12345678)। আলাদা হলে বদলাও।
   - `JWT_SECRET=` এর পরে একটা লম্বা random text বসাও। বানাতে:
     ```
     node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
     ```

৩) এক কমান্ডে পুরো database সেটআপ (DB তৈরি + schema + user + কেন্দ্র):
```
node setup-local.js
```
   "সেটআপ সম্পূর্ণ" দেখলে হয়ে গেছে।

## চালানো
```
node server.js
```
browser-এ যাও:  http://localhost:5000

লগইন:
- ইমেইল:  amin@horticulture.bd
- পাসওয়ার্ড:  Admin@1234

## নোট
- এটা v1-এর পুরোনো চেহারা, কিন্তু সব ফিচার আছে ও লোকালে চলছে।
- এর উপরেই নতুন React চেহারা ধাপে ধাপে বসবে (একই backend, একই deploy)।
- পরে DigitalOcean-এ গেলে শুধু .env-এর DB ঠিকানা বদলালেই হবে।
