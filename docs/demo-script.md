# Demo script (silent, with captions)

A 3 to 4 minute screen recording with no voiceover. Do each shot in order.
Overlay the caption lines on screen as you go. Use a fresh chat (New button)
for every chat shot so each flow starts clean.

## 0. Setup (before you press record)

1. Open the live chat: `https://rockdesk-iota.vercel.app/chat`.
2. Open the admin login in a second tab: `https://rockdesk-iota.vercel.app/login`.
3. Confirm the seeded people exist: Priya Menon, Rahul Sharma, Rahul Verma, Amit Kumar, Neha Singh.
4. Set your recorder to capture the browser window at 1080p. Turn on click highlighting if your tool has it.

## Shot 1, check 1: complete message, instant ticket (25 seconds)

Caption: "One complete message becomes a ticket instantly."

Type:

```text
Checkout page is throwing 500 errors for some users. Priya will fix it by Friday, high priority.
```

Hold 3 seconds on the confirmation card so the number, title, assignee, due date, and priority are all readable.

## Shot 2, checks 2 and 4: missing assignee and date (30 seconds)

New chat. Caption: "Missing fields are asked together, in one short question."

Type:

```text
Login page crashes on Safari.
```

Hold on the reply, then type `Amit Kumar, by Friday.` and hold on the created ticket.

## Shot 3, check 3: day without a month (25 seconds)

New chat. Caption: "A bare date is confirmed before anything is created."

Type:

```text
Login page crashes on Safari, Priya will fix it by the 4th.
```

Hold on the confirmation question, reply `Yes, October.`, hold on the ticket.

## Shot 4, check 5: two people, same first name (25 seconds)

New chat. Caption: "Two Rahuls. It asks instead of guessing."

Type:

```text
Search results are wrong, Rahul to fix by tomorrow.
```

Hold on the reply showing both Rahuls with departments. Click one name button, hold on the ticket.

## Shot 5, check 6: unknown assignee (20 seconds)

New chat. Caption: "Unknown names get the real team list."

Type:

```text
Search results are wrong, Zoravar to fix by tomorrow.
```

Hold on the reply naming the available people.

## Shot 6, checks 7 and 8: Hindi and Hinglish (30 seconds)

New chat. Caption: "Same flow, other languages. Replies match, titles stay English."

Type:

```text
Payment page bahut slow chal raha hai, Amit isko Friday tak dekh lega.
```

Hold on the reply and the card. If time allows, repeat once in Spanish: `La pagina de pago esta lenta, Amit lo revisa el viernes.`

## Shot 7, check 9: relative dates (20 seconds)

New chat. Caption: "Tomorrow means tomorrow, in your timezone."

Type:

```text
Search is down. Rahul Sharma will fix it by tomorrow, urgent.
```

Open the ticket in admin afterwards and hold on the due date.

## Shot 8, checks 10 and 11: cancel and small talk (20 seconds)

New chat. Caption: "Forget it drops the draft. Hello gets a hello."

Type `Login page is slow.`, then type `forget it` and hold on the discard reply. Then type `hello` and hold on the polite reply with no ticket.

## Shot 9, bonus: duplicate warning (20 seconds)

New chat. Caption: "Similar to an open ticket? It asks first."

Type a message close to a ticket you already created in shot 1. Hold on the duplicate card, click Create anyway, hold on the ticket.

## Shot 10, bonus: streaming and voice (15 seconds)

New chat. Caption: "Replies stream in. The mic dictates."

Send any message and let the reply render progressively. Click the microphone, say one sentence, show the text landing in the box.

## Shot 11, check 12: admin edits and filters (30 seconds)

Caption: "Everything lands in admin."

Sign in with `admin@rockdesk.demo` and the README password. Search once, open the newest ticket, change its status, hold on the new activity entry. Delete nothing; leave the data as the reviewer found it.

## Short notes for the Section 3 flows

- Example A (complete message): shots 1 and 7.
- Example B (missing assignee, unclear month): shots 2 and 3.
- Example C (Hinglish): shot 6.
- Example D (ambiguous Rahul): shot 4.
