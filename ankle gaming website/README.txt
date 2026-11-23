AnkleGaming Private Limited — Website
======================================

HOW TO OPEN THIS WEBSITE
------------------------
1. Extract (unzip) this file.
2. Open the "ankle-gaming-website" folder.
3. Double-click "index.html" — the website opens in your browser.
   No installation or internet setup is needed to view it.

   Note: The site loads its fonts from Google Fonts, so an internet
   connection gives the best look. Without internet it still works,
   using your device's default fonts.

WHAT'S INSIDE
-------------
  index.html          Main page (open this file)
  terms.html          Terms & Conditions
  privacy.html        Privacy Policy
  refund.html         Refund Policy
  cookies.html        Cookie Policy
  404.html            Page-not-found page
  favicon.svg         Browser tab icon
  css/style.css       All styling
  js/script.js        All interactivity (menus, sliders, forms, enquiry popup)
  assets/             All photos and the company logo
  sitemap.xml         SEO sitemap
  robots.txt          Search-engine rules
  _headers / _redirects  Hosting rules (Netlify/Render)


ENQUIRY POPUP & EMAIL NOTIFICATIONS
-----------------------------------
The enquiry form now opens automatically as a popup 1.4 seconds after the
page loads (once per browsing session) and also sends the same details by
email to the company inbox.

To receive the emails, the site must run through the bundled Node server
in the "server" folder (see server/README.md) and the mail credentials must
be set as environment variables — SMTP with Nodemailer, or the Resend API.
Credentials are never stored in these website files.

  cd server
  npm install
  cp .env.example .env     (then fill in the mail settings)
  npm start                (site opens on http://localhost:3000)

Until the mail settings are added, the form still validates but tells the
visitor to use WhatsApp or email, and never claims a message was sent.

HOW TO PUT IT ONLINE (OPTIONAL, FREE)
-------------------------------------
Drag this whole folder onto any free static host:
  - Netlify Drop: https://app.netlify.com/drop
  - Render: create a Static Site and set the publish directory to
    this folder (see render.yaml in the project repo).
  - GitHub Pages: push this folder to a repository and enable Pages.

CONTACT FORM
------------
The enquiry form is ready to use but needs a free Web3Forms access
key to receive messages by email. See the instructions in the
comment above the form in index.html and add the key to SITE_CONFIG
in js/script.js. Submitting the form also requires an internet connection.
WhatsApp and other external links likewise require an internet connection.

CONTACT
-------
  Email:    info@anklegaming.com
  Phone:    +91 95997 34137
  Office:   WZ 77, Ram Garh Colony, Basai Dara Pur, Bali Nagar,
            New Delhi, Delhi 110015, India

© AnkleGaming Private Limited. All rights reserved.
