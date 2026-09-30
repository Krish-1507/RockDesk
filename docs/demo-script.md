# Demo script

A 2 to 3 minute screen recording that walks a reviewer through the whole product.
Read the bold lines out loud. Type the quoted lines into the chat.

## 0. Setup (before you press record)

1. Open the live chat in one tab: `https://rockdesk-iota.vercel.app/chat`.
2. Open the admin login in a second tab: `https://rockdesk-iota.vercel.app/login`.
3. Start a fresh chat with the New button so the thread is empty.
4. Check the seeded people exist in admin: Priya Menon, Rahul Sharma, Rahul Verma, Amit Kumar, Neha Singh.

## 1. Intro (15 seconds)

**"This is RockDesk. I describe a problem in plain words, and it becomes a clean ticket. No forms."**

## 2. Complete message, instant ticket (30 seconds)

Type:

```text
Checkout page is throwing 500 errors for some users. Priya will fix it by Friday, high priority.
```

Point at the confirmation card: number, title, assignee, due date, priority.

**"Everything was in the message, so the ticket is created at once, with the source message attached."**

## 3. Missing fields, one question (30 seconds)

Start a new chat. Type:

```text
Login page crashes on Safari, this will be resolved by the 4th.
```

Point at the reply. It asks for the assignee and confirms the date in a single short message.

**"It asks for both missing pieces at once. It never guesses."**

Reply:

```text
Rahul Sharma, yes October.
```

Point at the created ticket.

## 4. Ambiguous name (25 seconds)

Start a new chat. Type:

```text
Search results are wrong, Rahul to fix by tomorrow.
```

Point at the reply listing both Rahuls with departments.

**"There are two Rahuls, so it asks which one instead of picking."**

Click one of the name buttons.

## 5. Another language (20 seconds)

Start a new chat. Type:

```text
Payment page bahut slow chal raha hai, Amit isko Friday tak dekh lega.
```

**"Same flow in Hinglish. The reply matches my language, and the ticket title is still clean English."**

## 6. Cancel (15 seconds)

Start a new chat. Type anything, then type:

```text
forget it
```

**"Typing forget it drops the draft. No ticket is created."**

## 7. Admin panel (30 seconds)

Switch to the login tab. Sign in with `admin@rockdesk.demo` and the password from the README.

Show the ticket list, use search once, open the newest ticket, change its status, point at the activity entry the change created.

**"Every ticket lands here with its source message. Search, filter, edit, all working."**

## 8. Outro (5 seconds)

**"That is the full loop. Chat in, clean ticket out."**
