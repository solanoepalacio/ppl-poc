# Opening the order link inside WhatsApp

The agent's order reply is a `cta_url` interactive message: a **Hacer mi pedido**
button rather than a raw URL in the body. This note records what that does and
does not buy us, because the interesting half is not under our control.

## There is no webview flag

Whether tapping the button opens WhatsApp's in-app browser (IAB) or the phone's
default browser is decided by the WhatsApp client, not by the payload. Nothing we
send requests it, and nothing we send suppresses it. Two gates decide it, and
they are independent.

## Gate 1 — the kind of message

| Message | In-app browser? |
|---|---|
| URL CTA button on a **template** (marketing or utility) | Yes. Reliably — developers are [asking Meta how to turn it off](https://developers.facebook.com/community/threads/1769928703670173/) because the webview has no password-manager or iOS OTP autofill. |
| Free-form `interactive` `cta_url` — **what we send** | Unclear. Meta's partners contradict each other: [Sprinklr](https://www.sprinklr.com/help/articles/whatsapp-webview-support/whatsapp-business-webview-support-inapp-browser-iab/691304747e4ef1475ff48386) says interactive buttons outside template CTAs do not qualify, [Wati](https://support.wati.io/en/articles/12867737-meta-introduces-in-app-browser-iab-experience-for-whatsapp) says interactive types are being added and payment links already work in both. |
| A raw URL in the body of any free-form message | No. Always the default browser. |

The button is worth having regardless of how it opens — it reads better than a
bare link — so this is not a reason to revert it.

## Gate 2 — the sending number's messaging tier

IAB requires a **daily messaging limit of at least 1,000 business-initiated
conversations** on the sending number. This is a property of the number, so a
template does not route around it.

Meta's [tiers](https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits)
are 250 → 2,000 → 10,000 → 100,000 → unlimited. There is no 1,000 tier, so the
threshold really means *anything above the default*, and the single step from 250
to 2,000 is **business verification**. It is the limit that counts, not the
volume actually sent — verified is enough, we do not have to send thousands.

Our replies are customer-initiated and therefore do not consume the limit at all.
The tier still gates IAB.

**Check the current limit in WhatsApp Manager → the phone number → messaging
limit.** That one value decides whether any of this is testable.

## None of it is documented by Meta

IAB does not appear in Meta's developer documentation or changelog. Every claim
above traces back to partner help-centre articles paraphrasing a partner
bulletin. There is no API to query eligibility, no opt-in, no opt-out, and no
changelog to watch — so this can change without an announcement, in either
direction.

Practical consequence: a button that opens the default browser proves nothing on
its own. It could be the tier, or it could be that free-form interactive does not
qualify. Only an in-app result is conclusive.

## If we go the template route, it stops being free

Today the reply is free: the customer messages first, which opens the 24-hour
service window, and free-form messages inside it cost nothing.

A utility template inside that same window is also free — but **only until
1 October 2026**, when Meta withdraws the exemption and utility templates revert
to standard per-message rates. After that, switching to a template to get the
webview means paying for every order link we send.

The link shape fits a template if we do go there: the button URL would be
`https://<frontend-host>/order/{{1}}` with the token as the parameter, which is
what `/order/<token>` already is.

## Limits that will reject a send outright

Over any of these, Meta rejects the message rather than truncating it — the
customer gets nothing. `whatsapp.service.spec.ts` pins the first two.

| Field | Limit |
|---|---|
| `display_text` (button label) | 20 characters |
| `body.text` | 1024 characters |
| header / footer text | 60 characters each |
