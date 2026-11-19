# Hidden Entries Recovery Guide

This document lists the **16 registration entries** hidden from the TechBETA 2026 Admin Dashboard, Master Directory, Event Rosters, Gate Scanner, and CSV/DOCX report exports.

> [!NOTE]
> **No database records were deleted.** All 16 entries remain 100% intact with their original database IDs, payment records, team associations, and registration timestamps.

---

## 1. Summary of Active Dashboard Numbers

- **Original Database Registrations**: 147
- **Hidden Entries**: 16 (all Cash registrations)
- **Active Visible Registrations**: **131 students**
  - **Razorpay (Online)**: 112 students
  - **Cash (Desk/Offline)**: 19 students (35 − 16 = 19)

---

## 2. Full Details of Hidden Participants

| # | Participant ID | Database ID (`cuid`) | Name | College | Dept & Year | Phone | Email | Events | Payment Type | Amount |
|---|----------------|----------------------|------|---------|-------------|-------|-------|--------|--------------|--------|
| 1 | **TB143** | `cmv86fj7c0004w0b77cp1n33r` | Aaris ahamed | SXCCE | CSE - cyber security (3rd Year) | `9385610130` | `aaris.142501@sxcce.edu.in` | BID & BUILD | Cash | ₹250 |
| 2 | **TB144** | `cmv86i7h00005w0b7d95s4kxw` | Shynu | SXCCE | CSE - CS (3rd Year) | `7708385564` | `vjshynu08@gmail.com` | BID & BUILD | Cash | ₹250 |
| 3 | **TB145** | `cmv86k8c60006w0b7vgr6cyrd` | Shibi Deepak | SXCCE | CSE - CS (3rd Year) | `9442826604` | `shibi.142553@sxcce.edu.in` | BID & BUILD | Cash | ₹250 |
| 4 | **TB146** | `cmv86n0hk0007w0b77odn4twq` | Akshaya B V | SXCCE | CSE (3rd Year) | `9123548202` | `akshaya121005@gmail.com` | UI-VERSE | Cash | ₹250 |
| 5 | **TB147** | `cmv86q8y80008w0b7pa9trt10` | Amrita | SXCCE | CSE (3rd Year) | `9894896161` | `senthilakumari1982@gmail.com` | UI-VERSE | Cash | ₹250 |
| 6 | **TB149** | `cmv86v6wr000aw0b7bvvj947l` | Blessing Bryson Hong P M K | SXCCE | AIDS (3rd Year) | `9345879632` | `blessingbrysonpmk@gmail.com` | GENBUILD, IDEA FORGE | Cash | ₹250 |
| 7 | **TB150** | `cmv86xc34000bw0b7lx29hnnu` | Earnest Abraham E A | SXCCE | AIDS (3rd Year) | `7358897598` | `earnest.143714@sxcce.edu.in` | GENBUILD, IDEA FORGE | Cash | ₹250 |
| 8 | **TB151** | `cmv86zq8c000cw0b7r7p10nz0` | Jerushin J | SXCCE | AIDS (3rd Year) | `9940899201` | `jerushin.143722@sxcce.edu.in` | GENBUILD, IDEA FORGE | Cash | ₹250 |
| 9 | **TB152** | `cmv871l5d000dw0b71021cb1v` | Jesinth S | SXCCE | AIDS (3rd Year) | `9789398246` | `jesinth.143724@sxcce.edu.in` | GENBUILD, IDEA FORGE | Cash | ₹250 |
| 10 | **TB159** | `cmv87odk0000iw0b7b80f5fgz` | Hari Suthan | Ponjesly College of Engineering | IT (3rd Year) | `9786015509` | `harisuthan7861@gmail.com` | UI-VERSE | Cash | ₹250 |
| 11 | **TB161** | `cmv87r94l0002yz61cksj7q7h` | Ananthu Krishnan | Ponjesly Engineering college | AIML (3rd Year) | `7550202571` | `sreenathkrishnan7550@gmail.com` | BRAND BLITZ | Cash | ₹250 |
| 12 | **TB162** | `cmv87t1ha0003yz61u1xvnjv7` | Akash P S | Ponjesly Engineering College | AIML (3rd Year) | `9486870841` | `akashps3728@gmail.com` | BRAND BLITZ | Cash | ₹250 |
| 13 | **TB163** | `cmv87vd0t0004yz61nteikst7` | Akash T | Ponjesly College of Engineering | AIML (3rd Year) | `7418737731` | `akasht2506@gmail.com` | BRAND BLITZ | Cash | ₹250 |
| 14 | **TB165** | `cmv87z1uh0006yz61fcwe68ms` | Sajina M | Ponjesly College of Engineering | IT (3rd Year) | `7550321805` | `sajina9488@gmail.com` | UI-VERSE, BRAND BLITZ, BID & BUILD | Cash | ₹250 |
| 15 | **TB167** | `cmv8839at000kw0b7rr4srslt` | Godlin Preetha M | Ponjesly college of engineering | IT (3rd Year) | `7550321505` | `sajina9488@gmail.com` | UI-VERSE | Cash | ₹250 |
| 16 | **TB169** | `cmv887jcb0008yz61ozd5w39v` | Abinaya X | Annai Vailankanni College of engineering | ECE (3rd Year) | `9751087673` | `abinayaxavier143@gmail.com` | IDEA FORGE, BID & BUILD | Cash | ₹250 |

---

## 3. How to Restore / Unhide Entries in the Future

All hiding rules are controlled centrally in **`src/lib/hiddenEntries.ts`**.

### Option A: Restore All 16 Entries at Once
Open `src/lib/hiddenEntries.ts` and change line 10:
```typescript
// From:
export const HIDE_ENTRIES_ENABLED = true;

// To:
export const HIDE_ENTRIES_ENABLED = false;
```
Save the file. Immediately upon refresh, all 16 entries will re-appear in all dashboards, stats (147 total), and reports.

### Option B: Restore Individual Specific Entries
If you only want to restore one or a few entries (e.g. restore only TB143), remove `143` from `HIDDEN_PARTICIPANT_NUMBERS`, `'TB143'` from `HIDDEN_PARTICIPANT_IDS`, and its ID from `HIDDEN_DB_IDS` in `src/lib/hiddenEntries.ts`.

---

## 4. Verification Check
You can verify the database contents anytime with Node.js:
```bash
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.registration.findMany().then(r => console.log('Total in DB:', r.length));"
```
Output will remain **147**, showing all records are safe.

