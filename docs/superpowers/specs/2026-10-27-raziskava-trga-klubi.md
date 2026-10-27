# Amateur football club software: market scan (Oct 2026)

## Comparison

| Product | Segment | Core | Pricing (public) | Regions / langs | Weaknesses (reviews) |
|---|---|---|---|---|---|
| **Spond** | Grassroots teams and clubs, all sports | Events/RSVP, chat, payments, member register, website add-on | App free; payments 2.5% + €0.20 (EUR); website €15/mo [1] | NO origin, EU/UK/US | Notification overload, group members see each other's emails (GDPR), calendar sync adds all events [2] |
| **TeamSnap** | US youth teams/clubs | Schedule, RSVP, registration, payments, websites | Team $0–129.99/yr; club/league from $599/yr [3] | US-centric, EN/FR/ES | US focus, roster caps per tier |
| **SportEasy** | FR amateur teams/clubs | Schedule, lineups, match stats (manual), fee collection, sponsor plan | Free ≤30 members; Premium €69/team/yr; Club €0.33–0.48/member/mo [4] | FR, EU | Few reviews; stats are entered by hand |
| **Heja** | Youth teams (SE origin) | Schedule, RSVP, chat | Free with ads; Pro ~$99.99/team/yr, Pro Max $139.99 [5] | Nordics, global | 3.3/5 on Capterra: aggressive ads even after paying, calendar sync paywalled, freezes [6] |
| **Teamer** | UK grassroots teams | Events, availability, payments | Free with ads; Premium per team (ad removal, 50 SMS/mo) [7] | UK | Per-team billing, ads |
| **SpielerPlus / TeamPlus** | DACH amateur teams | Calendar, chat, polls, stats, team treasury, penalty catalogue, lineups | Free tier plus Premium (price not public) [8] | DACH, 10+ langs, 410k teams | Manual stats |
| **Clubee** | Clubs and federations (BE/FR/CH) | Members, website with own domain, auto social posts, sponsors, payments, shop | Free / Amateur (≤200 members) / Amateur+ / Pro; prices not indexed [9] | FR/BE/EU | n/a |
| **360Player** | Clubs/academies | Admin, payments, website, plus video, stats, development plans, scouting profiles | $49/mo per club; +$3/user/mo for performance [10] | SE origin, global | Per-user cost scales quickly |
| **Coachbetter** | Coaches (CH) | Training plans, drills, attendance, stats | $64.99–159.99/yr per coach; club custom [11] | CH/DE, EN/DE | Coach tool, not club admin |
| **easy2coach** | DE coaches/clubs | Drill library, training planning, team org | Club €389/yr for up to 10 teams [12] | DE | Content-centric |
| **Sportlyzer** | Youth clubs (EE) | Attendance, SMS/email, athlete progress | from €7.50/user/mo [13] | EE/Baltics | Small user base |
| **Vereinsplaner** (vereinsplaner.at, Linz) | DACH Vereine, all types | Members, fees, SEPA, accounting, chat, events | Free (5 accounts); Pro €119/yr; Premium from €14.92/mo [14][15] | AT/DE/CH, 15k clubs | Free tier is a trial in practice |
| **ClubDesk** | DACH/CH Vereine | Members, accounting, website, calendar | Free ≤50 members; €10–33+/mo by member count [16] | CH/DACH | Generic, not football |
| **Campai** | DE/AT Vereine | Members, fees, accounting, portal, digital cards | €30/mo base for 100 members, per active member [17] | DE/AT | Generic |
| **SPG-Verein** | n/a | No public pricing or reviews found | n/a | DE | n/a |
| **DFBnet / FUSSBALL.DE** | All DE clubs (federation) | Registration, Spielbericht, live ticker, results; DFBnet Verein = member admin | Federation tools are mandatory; DFBnet Verein from €129/yr [18][19] | DE | Admin UX, no analytics |
| **COMET (Analyticom)** | Federations: HNS, NZS and many others | Registration, transfers, player passport, lineups, match report app | Paid by the federation, free to clubs [20][21] | SI, HR, much of Europe | Admin tool only, no club insight |
| **MLSZ IFA** (HU) | Hungarian federation | Match reports, registration | Federation | HU | Public criticism of reliability [22] |
| **FuPa** | DE amateur fans/media | Club pages, line-ups, tickers, transfers (crowd-maintained) | Free, ad-funded | DE | Volunteer data entry [23] |
| **Veo** | Amateur–semi-pro video | AI camera, highlights, analytics add-on | €999 camera + €45–165/mo; analytics from $37/mo [24] | Global | Needs hardware and filming every match |
| **Hudl (Focus Flex)** | Semi-pro/pro | Camera plus analysis | Custom; club team tiers $400–1,600/team/yr (US) [25][26] | Global | Cost |
| **Wyscout / Hudl Instat** | Pro scouting | Video, data, scouting database | Quote only, ~€15–25k/yr per club [27] | Global | Unaffordable; thin below 3rd–4th tier |
| **Transfermarkt** | Fans/scouts | Market values, transfers | Free | Global | Crowd data, sparse in regional leagues |
| **SAITO** (HR, Erasmus+ pilot) | Croatian clubs | Members, fees, training, medical records | Free pilot [28] | HR | Early stage |

Regionally (SI/HR/SK/HU) there is no dominant commercial club tool. Clubs use federation systems (COMET, IFA) for the mandatory admin, and Spond, WhatsApp/Viber and Excel for everything else. Local players are pilots or student projects ([28], Serbian Evico).

## 1. Table stakes (every tool has these)

- Calendar and events with RSVP/availability plus reminders, synced to the phone calendar.
- Team chat and announcements, with parent accounts that are linked to the child.
- A member/roster register with roles (admin, coach, player, parent).
- Fee collection: membership fees and per-event payments by card or SEPA, usually through Stripe.
- Attendance statistics.
- Free mobile apps, with a free tier per team (often ad-funded) and paid tiers that remove ads or raise limits.
- In DACH, Verein admin (SEPA mandates, bookkeeping, member letters) is a separate category of its own: Vereinsplaner, ClubDesk, Campai, DFBnet Verein.

## 2. The gap for automatic official match data

Every team app (SportEasy, SpielerPlus, 360Player) has match stats, but **a coach types them in by hand**, so they are usually empty. Federation systems (DFBnet, COMET, IFA) hold the official data but use it only for administration and offer clubs no analytics. Wyscout and InStat start where the money is (pro and upper semi-pro). Veo and Hudl need a camera and someone filming every match. FuPa and Transfermarkt rely on volunteers. That leaves a product that is **zero-entry, league-wide and cross-league** uncontested:

- **Own squad, without typing:** minutes, goals, cards and starts per player, plus season and multi-season history and attendance compared with match minutes.
- **Card discipline:** yellow-card accumulation and suspension warnings before the deadline. This is a real pain point; DFBnet does automatic suspensions, but only for administration.
- **Opponent reports:** the likely XI, who plays 90 minutes, scorers, goalkeeper and form, for every opponent in the league. No amateur tool has this.
- **Recruitment and scouting below Wyscout:** who plays minutes in lower leagues, similar players, squad gaps, players leaving clubs. This is the current Scout product, which pros pay €15k+ for and amateurs have nothing for.
- **Automatic content:** match posters, scorer graphics and website widgets fed from the reports. Clubee sells auto-generated social posts; SLFF already has the og-image and posts pipeline.
- **Sponsor value:** reach numbers from the fantasy audience. SportEasy and Clubee sell "sponsor plans" with no reach data.
- **Distribution moat:** every club in the league is already in the database, so onboarding means "claim your club" rather than "set up your club". The fantasy players are the club's own fans and players.

To become "universal", the minimum to add is the table stakes: calendar/RSVP, chat or notifications, and fee collection. It is better to integrate or coexist with Spond than to fight it on free messaging.

## 3. What clubs pay for, and at what price (EUR)

- **Saving admin time and money flow:** fees and payments. Spond takes a transaction cut (2.5% + €0.20) instead of a subscription. Verein admin costs €119–400/yr (Vereinsplaner, ClubDesk, Campai, DFBnet Verein).
- **Per-team team app:** about €69–100/team/yr (SportEasy, Heja, TeamSnap). Club bundles cost €0.33–0.48/member/mo (SportEasy), $599/yr and up (TeamSnap clubs), or $49/mo per club (360Player).
- **Website:** about €15/mo (Spond add-on); usually bundled into club plans.
- **Coaching content:** €65–160/coach/yr, or €389/club/yr (easy2coach).
- **Video:** the largest discretionary spend at semi-pro level, at €540–2,000/yr plus €999 hardware (Veo). It often comes from sponsors.
- **Pro scouting:** €15–25k/yr, which is out of reach.

**Realistic band** for a regional club tool: **€100–600 per club per year**, priced per club rather than per member, because many teams in a club means per-team pricing hurts. Add a free tier for single teams, and earn on payment processing fees.

## 4. GDPR and minors (recurring themes)

- **Digital age of consent differs by country** (Art. 8): SI 15, AT 14, HR 16; DE, SK and HU use the GDPR default of 16. Below that age a parent must consent, so you need parent accounts and consent management per child [29][30].
- **Croatia** in practice requires parental consent under 18. **Austria** requires guardian consent for special-category data even at age 14+ [30].
- **Health data** (medicals, injuries, fitness) is Art. 9 special-category data. It needs explicit consent, role-based access (medical staff only) and minimisation. SAITO and 360Player store it.
- **Photos and video of minors** (Veo/Hudl filming youth matches, auto social posts) need consent and opt-out. SLFF already rule: no youth leagues in posts or cards.
- **Visibility inside the app:** the top Spond complaint is that 200+ group members can see each other's emails [2]. Default member directories to private.
- **Roles:** the club is the controller and the vendor is the processor. You need an Art. 28 DPA, EU hosting (Campai advertises DE hosting) and a deletion/export flow.
- **Official match data:** processing public match reports about adults rests on legitimate interest, with a right to object. Keep youth players out of scouting/profiling, as Scout already does, and honour objections across all leagues.

## Sources
[1] https://help.spond.com/club/en/articles/58192-what-is-the-transaction-fee-in-spond-club
[2] https://www.onclarity.com/leaderboard/insight/spond ; https://nl.trustpilot.com/review/spond.com
[3] https://www.capterra.com/p/123208/teamsnap/
[4] https://us.fitgap.com/products/024553/sporteasy
[5] https://apppricinglab.com/iap/apple/1157335714 ; https://help.heja.io/en/articles/3727834-heja-free-vs-team-pro-or-max
[6] https://trustburn.com/reviews/heja ; https://www.capterra.com.au/software/1014739/heja
[7] https://help.teamer.net/knowledge/admin/premium/teamer-premium
[8] https://www.spielerplus.de
[9] https://web.clubee.com/en/pricing-plans
[10] https://www.capterra.co.uk/software/1034687/360player
[11] https://www.coachbetter.com/pricing
[12] https://www.easy2coach.net/en/football-sofware-club-membership.html
[13] https://capterra.com/p/144279/Sportlyzer/
[14] https://vereinsplaner.com/en/preise ; https://trusted.de/vereinsplaner-kosten
[15] https://www.trendingtopics.eu/all-in-one-saas-vereinsplaner-will-800-000-vereine-im-dach-raum-ueberzeugen/
[16] https://trusted.de/clubdesk-kosten
[17] https://trusted.de/campai-kosten
[18] https://www.softwareabc24.de/verein-software/dfbnet-verein
[19] https://www.dfb.de/fileadmin/_dfbdam/13934-DFBnet-Broschuere-Neuauflage-2013-DE.pdf
[20] https://kb.analyticom.de/comet/comet-football-apps
[21] https://nsosijek.hr/vijesti/vijesti_HNS_Odluka_o_preregistraciji_2025.pdf
[22] https://hvg.hu/kkv/20240311_mlsz-otp-jegyertekesites-ugyviteli-rendszer-ceghalo-interticket-jet-sol-smp-solutions
[23] https://www.volksstimme.de/sport/frischmuth-fupa-ist-das-beste-portal-1095676
[24] https://support.veo.com/hc/en-us/articles/4450464075025 ; https://shop.veo.co/
[25] https://hudl.com/en_gb/products/focus/flex
[26] https://www.hudl.com/pricing/club/hudl/basketball
[27] https://footballanalytics.ai/european-football-technology/european-football-scouting-platform-pricing
[28] https://www.novilist.hr/?p=1748118
[29] https://gdprlocal.com/digital-age-of-consent-under-the-gdpr/
[30] https://childreninthedigitalworld.twobirds.com/home/slovenia ; https://childreninthedigitalworld.twobirds.com/home/austria
