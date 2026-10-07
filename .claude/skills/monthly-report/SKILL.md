---
name: monthly-report
description: Turn a client's monthly leads export (CSV or pasted rows from the leads sheet) into a short Hebrew WhatsApp report for the business owner — leads count, sources, services, response time, one recommendation. Use at month end or when Kfir says "דוח חודשי ל...".
---

# Monthly client report

## Input

A CSV export, or pasted rows, from the client's leads sheet. Expected columns, as the landing-page form sends them: `name, phone, service, source, campaign, submitted_at`. Optional columns: `status`, `replied_at`.

If columns are missing, work with what exists and say which numbers could not be calculated. Never estimate a number.

## Calculate

- Total leads this month, and the change from last month if `clients/<slug>/reports/` has the previous report
- Leads by service and by source (`utm_source`). Show the top 3 of each.
- Busiest day of the week and busiest hours
- If `replied_at` exists: the median time to first reply, and how many leads waited more than 3 hours
- If `status` exists: how many leads became jobs

Run the numbers with a short script (Python or Node) over the file. Don't count by eye.

## Write the report

Hebrew WhatsApp message, up to about 10 lines:

```
היי {owner}, הדוח של {month}:
📥 {n} פניות ({delta} לעומת החודש הקודם)
🔧 הכי מבוקש: {service1} ({x}), {service2} ({y})
📍 מקורות: {source1} {a}, {source2} {b}
⏱ זמן מענה חציוני: {t}
💡 המלצה לחודש הבא: {one concrete, small action}
```

- The recommendation must follow from the data. For example: most leads arrive on Sunday evening, so a reply is needed by Monday morning.
- No promises, no blame.

## Save

Save the report to `clients/<slug>/reports/YYYY-MM.md`, so next month has a baseline. Don't commit the raw lead data (names, phones). Keep only the aggregated numbers.
