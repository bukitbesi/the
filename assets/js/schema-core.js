/* Schema Markup Generator core. Field definitions, JSON-LD builders and checks for the structured data types Google
   Search supports (required and recommended properties from Google Search Central), plus FAQPage, which Google no
   longer shows as a rich result (May 2026) but other search engines and AI assistants still read.
   UMD: module.exports in Node, window.TBBSchema in the browser. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-19', faqRetired: '2026-05-07' };
  var AVAIL = ['InStock', 'OutOfStock', 'PreOrder', 'BackOrder', 'LimitedAvailability', 'Discontinued'];
  var APP_CATS = ['BusinessApplication', 'DeveloperApplication', 'DesignApplication', 'EducationalApplication', 'FinanceApplication', 'GameApplication', 'HealthApplication', 'LifestyleApplication', 'MultimediaApplication', 'ReferenceApplication', 'ShoppingApplication', 'SocialNetworkingApplication', 'SportsApplication', 'TravelApplication', 'UtilitiesApplication'];
  var BIZ = ['LocalBusiness', 'Restaurant', 'CafeOrCoffeeShop', 'Store', 'AutoRepair', 'BeautySalon', 'Dentist', 'MedicalClinic', 'LegalService', 'RealEstateAgent', 'LodgingBusiness', 'HomeAndConstructionBusiness', 'EducationalOrganization'];
  var DAYS = { mo: 'Monday', tu: 'Tuesday', we: 'Wednesday', th: 'Thursday', fr: 'Friday', sa: 'Saturday', su: 'Sunday' };
  var DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // ---------------------------------------------------------------- helpers
  var trim = function (v) { return v == null ? '' : String(v).trim(); };
  var lines = function (v) { return trim(v).split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean); };
  var num = function (v) { var n = parseFloat(String(v).replace(/,/g, '')); return isFinite(n) ? n : undefined; };
  var isUrl = function (v) { return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(trim(v)); };

  // Drops empty strings, undefined, empty arrays and objects left with only @type.
  function clean(x) {
    if (Array.isArray(x)) { var a = x.map(clean).filter(function (v) { return v !== undefined; }); return a.length ? a : undefined; }
    if (x && typeof x === 'object') {
      var o = {}, keys = 0;
      Object.keys(x).forEach(function (k) { var v = clean(x[k]); if (v !== undefined) { o[k] = v; if (k !== '@type') keys++; } });
      return keys ? o : undefined;
    }
    return x === '' || x === null || x === undefined || (typeof x === 'number' && !isFinite(x)) ? undefined : x;
  }

  // "4:30" -> PT4M30S, "1:02:03" -> PT1H2M3S, minutes (number) -> PT#H#M.
  function duration(v, unit) {
    var s = trim(v);
    if (!s) return undefined;
    var secs;
    if (unit === 'min') { var m = num(s); if (m === undefined) return undefined; secs = Math.round(m * 60); }
    else {
      var p = s.split(':').map(Number);
      if (p.some(isNaN) || p.length > 3) return undefined;
      secs = p.reduce(function (acc, x) { return acc * 60 + x; }, 0);
    }
    var h = Math.floor(secs / 3600), mi = Math.floor(secs % 3600 / 60), se = secs % 60;
    return 'PT' + (h ? h + 'H' : '') + (mi ? mi + 'M' : '') + (se || (!h && !mi) ? se + 'S' : '');
  }
  // "2026-10-19T20:00" + "+08:00" -> "2026-10-19T20:00:00+08:00"; a date alone stays a date.
  function dateTime(v, tz) {
    var s = trim(v);
    if (!s) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    var m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(:\d{2})?$/.exec(s);
    return m ? m[1] + 'T' + m[2] + (m[3] || ':00') + (tz || '+08:00') : s;
  }
  // "Mon-Fri 09:00-18:00", "Sat 10:00-14:00", "Sun closed" -> OpeningHoursSpecification[]
  function hours(v) {
    return lines(v).map(function (l) {
      var m = /^([a-z]{2})[a-z]*(?:\s*[-–]\s*([a-z]{2})[a-z]*)?\s+(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})$/i.exec(l);
      if (!m || !DAYS[m[1].toLowerCase()] || (m[2] && !DAYS[m[2].toLowerCase()])) return null;
      var a = DAY_ORDER.indexOf(DAYS[m[1].toLowerCase()]), b = m[2] ? DAY_ORDER.indexOf(DAYS[m[2].toLowerCase()]) : a;
      var days = [];
      for (var i = a; ; i = (i + 1) % 7) { days.push(DAY_ORDER[i]); if (i === b) break; }
      var t = function (x) { var q = x.replace('.', ':').split(':'); return ('0' + q[0]).slice(-2) + ':' + q[1]; };
      return { '@type': 'OpeningHoursSpecification', dayOfWeek: days.length === 1 ? days[0] : days, opens: t(m[3]), closes: t(m[4]) };
    }).filter(Boolean);
  }
  function badHours(v) { return lines(v).filter(function (l) { return !/closed|tutup/i.test(l) && !hours(l).length; }); }
  function youtubeId(u) {
    var m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/.exec(trim(u));
    return m ? m[1] : '';
  }
  function address(v) {
    return { '@type': 'PostalAddress', streetAddress: trim(v.street), addressLocality: trim(v.city), addressRegion: trim(v.region), postalCode: trim(v.postcode), addressCountry: trim(v.country) };
  }
  var ADDR = [['street', 'Street address', 'text'], ['city', 'Town or city', 'text'], ['region', 'State', 'text'], ['postcode', 'Postcode', 'text'], ['country', 'Country code', 'text', 'MY']];

  // ---------------------------------------------------------------- types
  // Field: [key, label, kind, default, options] with req/rec lists per type. Kinds: text url date datetime number textarea lines select.
  var TYPES = {
    article: {
      label: 'Article / blog post', rich: 'Article rich results: headline, image and date in Top stories and Discover.',
      fields: [['kind', 'Type', 'select', 'BlogPosting', ['BlogPosting', 'Article', 'NewsArticle']], ['headline', 'Headline', 'text', 'Cara Kira Zakat Pendapatan 2026'], ['description', 'Description', 'textarea'],
        ['url', 'Page URL', 'url', 'https://www.example.com/zakat-pendapatan'], ['image', 'Image URLs (one per line)', 'lines', 'https://www.example.com/images/zakat-1200.jpg'], ['datePublished', 'Published', 'datetime', '2026-10-19T09:00'],
        ['dateModified', 'Updated', 'datetime'], ['authorName', 'Author name', 'text', 'Ali bin Abu'], ['authorUrl', 'Author profile URL', 'url'], ['publisher', 'Publisher (site) name', 'text'], ['publisherLogo', 'Publisher logo URL', 'url']],
      req: [], rec: ['headline', 'image', 'datePublished', 'dateModified', 'authorName', 'authorUrl'],
      build: function (v) {
        return { '@type': v.kind || 'BlogPosting', headline: trim(v.headline), description: trim(v.description), mainEntityOfPage: trim(v.url), url: trim(v.url), image: lines(v.image),
          datePublished: dateTime(v.datePublished, v.tz), dateModified: dateTime(v.dateModified, v.tz),
          author: { '@type': 'Person', name: trim(v.authorName), url: trim(v.authorUrl) },
          publisher: { '@type': 'Organization', name: trim(v.publisher), logo: v.publisherLogo ? { '@type': 'ImageObject', url: trim(v.publisherLogo) } : undefined } };
      }
    },
    product: {
      label: 'Product', rich: 'Product snippets: price, availability and rating under your result.',
      fields: [['name', 'Product name', 'text', 'Kopi Tenom 1kg'], ['description', 'Description', 'textarea'], ['image', 'Image URLs (one per line)', 'lines'], ['brand', 'Brand', 'text'], ['sku', 'SKU', 'text'],
        ['url', 'Product page URL', 'url'], ['price', 'Price', 'number', '45.90'], ['currency', 'Currency', 'text', 'MYR'], ['availability', 'Availability', 'select', 'InStock', AVAIL], ['priceValidUntil', 'Price valid until', 'date'],
        ['ratingValue', 'Average rating (1–5)', 'number'], ['ratingCount', 'Number of ratings', 'number']],
      req: ['name'], rec: ['image', 'description', 'brand', 'price', 'ratingValue'],
      build: function (v) {
        var price = num(v.price), rv = num(v.ratingValue), rc = num(v.ratingCount);
        return { '@type': 'Product', name: trim(v.name), description: trim(v.description), image: lines(v.image), sku: trim(v.sku), url: trim(v.url),
          brand: v.brand ? { '@type': 'Brand', name: trim(v.brand) } : undefined,
          offers: price !== undefined ? { '@type': 'Offer', price: price.toFixed(2), priceCurrency: trim(v.currency) || 'MYR', availability: 'https://schema.org/' + (v.availability || 'InStock'), url: trim(v.url), priceValidUntil: trim(v.priceValidUntil) } : undefined,
          aggregateRating: rv !== undefined && rc ? { '@type': 'AggregateRating', ratingValue: rv, reviewCount: rc } : undefined };
      }
    },
    local: {
      label: 'Local business', rich: 'Business details in the knowledge panel and Maps: hours, address and phone.',
      fields: [['kind', 'Business type', 'select', 'LocalBusiness', BIZ], ['name', 'Business name', 'text', 'Kedai Kopi Bukit Besi'], ['image', 'Photo URL', 'url'], ['url', 'Website', 'url'], ['telephone', 'Phone (with +60)', 'text', '+60 9-123 4567'],
        ['priceRange', 'Price range', 'text', 'RM'], ['street', 'Street address', 'text', 'Jalan Besar'], ['city', 'Town or city', 'text', 'Dungun'], ['region', 'State', 'text', 'Terengganu'], ['postcode', 'Postcode', 'text', '23200'], ['country', 'Country code', 'text', 'MY'],
        ['lat', 'Latitude', 'number'], ['lng', 'Longitude', 'number'], ['hours', 'Opening hours (e.g. Mon-Fri 09:00-18:00)', 'lines', 'Mon-Fri 08:00-18:00\nSat 08:00-13:00'], ['sameAs', 'Social profiles (one per line)', 'lines']],
      req: ['name', 'street'], rec: ['telephone', 'url', 'image', 'hours', 'lat', 'priceRange'],
      build: function (v) {
        var lat = num(v.lat), lng = num(v.lng);
        return { '@type': v.kind || 'LocalBusiness', name: trim(v.name), image: trim(v.image), url: trim(v.url), telephone: trim(v.telephone), priceRange: trim(v.priceRange), address: address(v),
          geo: lat !== undefined && lng !== undefined ? { '@type': 'GeoCoordinates', latitude: lat, longitude: lng } : undefined,
          openingHoursSpecification: hours(v.hours), sameAs: lines(v.sameAs) };
      }
    },
    organization: {
      label: 'Organization', rich: 'Logo and details in your knowledge panel and search results.',
      fields: [['name', 'Organization name', 'text', 'The Bukit Besi'], ['legalName', 'Legal name (e.g. Sdn Bhd)', 'text'], ['url', 'Website', 'url', 'https://www.example.com'], ['logo', 'Logo URL (at least 112×112 px)', 'url'], ['description', 'Description', 'textarea'],
        ['email', 'Email', 'text'], ['telephone', 'Phone', 'text'], ['street', 'Street address', 'text'], ['city', 'Town or city', 'text'], ['region', 'State', 'text'], ['postcode', 'Postcode', 'text'], ['country', 'Country code', 'text', 'MY'], ['sameAs', 'Social profiles (one per line)', 'lines']],
      req: [], rec: ['name', 'url', 'logo', 'sameAs'],
      build: function (v) {
        return { '@type': 'Organization', name: trim(v.name), legalName: trim(v.legalName), url: trim(v.url), logo: trim(v.logo), description: trim(v.description), email: trim(v.email), telephone: trim(v.telephone),
          address: address(v), sameAs: lines(v.sameAs) };
      }
    },
    event: {
      label: 'Event', rich: 'Event listings with date, place and tickets.',
      fields: [['name', 'Event name', 'text', 'Bengkel SEO Blogger Terengganu'], ['description', 'Description', 'textarea'], ['startDate', 'Starts', 'datetime', '2026-11-21T09:00'], ['endDate', 'Ends', 'datetime', '2026-11-21T17:00'],
        ['mode', 'Attendance', 'select', 'OfflineEventAttendanceMode', ['OfflineEventAttendanceMode', 'OnlineEventAttendanceMode', 'MixedEventAttendanceMode']], ['status', 'Status', 'select', 'EventScheduled', ['EventScheduled', 'EventPostponed', 'EventRescheduled', 'EventCancelled']],
        ['venue', 'Venue name', 'text', 'Dewan Besar'], ['street', 'Street address', 'text', 'Jalan Sultan Ismail'], ['city', 'Town or city', 'text', 'Kuala Terengganu'], ['region', 'State', 'text', 'Terengganu'], ['postcode', 'Postcode', 'text', '20200'], ['country', 'Country code', 'text', 'MY'],
        ['online', 'Online event URL', 'url'], ['image', 'Image URL', 'url'], ['organizer', 'Organizer name', 'text'], ['organizerUrl', 'Organizer URL', 'url'], ['price', 'Ticket price (0 if free)', 'number'], ['currency', 'Currency', 'text', 'MYR'], ['ticketUrl', 'Ticket URL', 'url']],
      req: ['name', 'startDate'], rec: ['description', 'endDate', 'image', 'organizer', 'price'],
      build: function (v) {
        var price = num(v.price), mode = v.mode || 'OfflineEventAttendanceMode', loc = [];
        if (mode !== 'OnlineEventAttendanceMode') loc.push({ '@type': 'Place', name: trim(v.venue), address: address(v) });
        if (mode !== 'OfflineEventAttendanceMode') loc.push({ '@type': 'VirtualLocation', url: trim(v.online) });
        return { '@type': 'Event', name: trim(v.name), description: trim(v.description), startDate: dateTime(v.startDate, v.tz), endDate: dateTime(v.endDate, v.tz),
          eventAttendanceMode: 'https://schema.org/' + mode, eventStatus: 'https://schema.org/' + (v.status || 'EventScheduled'), location: loc.length === 1 ? loc[0] : loc, image: trim(v.image),
          organizer: { '@type': 'Organization', name: trim(v.organizer), url: trim(v.organizerUrl) },
          offers: price !== undefined ? { '@type': 'Offer', price: price.toFixed(2), priceCurrency: trim(v.currency) || 'MYR', url: trim(v.ticketUrl), availability: 'https://schema.org/InStock' } : undefined };
      }
    },
    recipe: {
      label: 'Recipe', rich: 'Recipe cards with photo, rating, cooking time and calories.',
      fields: [['name', 'Recipe name', 'text', 'Nasi Lemak Kukus'], ['image', 'Image URLs (one per line)', 'lines', 'https://www.example.com/images/nasi-lemak.jpg'], ['description', 'Description', 'textarea'], ['authorName', 'Author', 'text'], ['datePublished', 'Published', 'date'],
        ['prepTime', 'Prep time (minutes)', 'number', '20'], ['cookTime', 'Cook time (minutes)', 'number', '40'], ['recipeYield', 'Servings', 'text', '4'], ['recipeCategory', 'Category', 'text', 'Main course'], ['recipeCuisine', 'Cuisine', 'text', 'Malaysian'],
        ['keywords', 'Keywords', 'text'], ['calories', 'Calories per serving', 'number'], ['ingredients', 'Ingredients (one per line)', 'lines', '2 cups rice\n1 cup coconut milk\n2 pandan leaves'], ['steps', 'Steps (one per line)', 'lines', 'Wash the rice.\nSteam with coconut milk and pandan for 40 minutes.'],
        ['ratingValue', 'Average rating (1–5)', 'number'], ['ratingCount', 'Number of ratings', 'number']],
      req: ['name', 'image'], rec: ['description', 'authorName', 'prepTime', 'cookTime', 'ingredients', 'steps', 'recipeYield'],
      build: function (v) {
        var p = duration(v.prepTime, 'min'), c = duration(v.cookTime, 'min'), t = num(v.prepTime) !== undefined || num(v.cookTime) !== undefined ? duration((num(v.prepTime) || 0) + (num(v.cookTime) || 0), 'min') : undefined;
        var rv = num(v.ratingValue), rc = num(v.ratingCount), cal = num(v.calories);
        return { '@type': 'Recipe', name: trim(v.name), image: lines(v.image), description: trim(v.description), author: { '@type': 'Person', name: trim(v.authorName) }, datePublished: trim(v.datePublished),
          prepTime: p, cookTime: c, totalTime: t, recipeYield: trim(v.recipeYield), recipeCategory: trim(v.recipeCategory), recipeCuisine: trim(v.recipeCuisine), keywords: trim(v.keywords),
          nutrition: cal !== undefined ? { '@type': 'NutritionInformation', calories: cal + ' calories' } : undefined,
          recipeIngredient: lines(v.ingredients), recipeInstructions: lines(v.steps).map(function (s) { return { '@type': 'HowToStep', text: s }; }),
          aggregateRating: rv !== undefined && rc ? { '@type': 'AggregateRating', ratingValue: rv, ratingCount: rc } : undefined };
      }
    },
    video: {
      label: 'Video', rich: 'Video results with thumbnail, duration and key moments.',
      fields: [['youtube', 'YouTube link (fills embed URL and thumbnail)', 'url', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'], ['name', 'Video title', 'text', 'Cara Kira Zakat Pendapatan dalam 3 Minit'], ['description', 'Description', 'textarea', 'Langkah demi langkah mengira zakat pendapatan 2026.'],
        ['thumbnailUrl', 'Thumbnail URL', 'url'], ['uploadDate', 'Upload date and time', 'datetime', '2026-10-19T20:00'], ['duration', 'Duration (m:ss or h:mm:ss)', 'text', '3:25'], ['contentUrl', 'Video file URL (.mp4)', 'url'], ['embedUrl', 'Embed URL', 'url'],
        ['creatorName', 'Creator name', 'text'], ['creatorUrl', 'Creator URL', 'url'], ['views', 'View count', 'number']],
      req: ['name', 'thumbnailUrl', 'uploadDate'], rec: ['description', 'duration', 'contentUrl', 'embedUrl', 'creatorName'],
      prefill: function (v) {
        var id = youtubeId(v.youtube), o = {};
        if (id) { o.embedUrl = 'https://www.youtube.com/embed/' + id; o.thumbnailUrl = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; }
        return o;
      },
      build: function (v) {
        var views = num(v.views);
        return { '@type': 'VideoObject', name: trim(v.name), description: trim(v.description), thumbnailUrl: trim(v.thumbnailUrl), uploadDate: dateTime(v.uploadDate, v.tz), duration: duration(v.duration),
          contentUrl: trim(v.contentUrl), embedUrl: trim(v.embedUrl), creator: v.creatorName ? { '@type': 'Person', name: trim(v.creatorName), url: trim(v.creatorUrl) } : undefined,
          interactionStatistic: views !== undefined ? { '@type': 'InteractionCounter', interactionType: { '@type': 'WatchAction' }, userInteractionCount: Math.round(views) } : undefined };
      }
    },
    software: {
      label: 'Software app / web tool', rich: 'App rich results with price and rating.',
      fields: [['name', 'App or tool name', 'text', 'Kalkulator Zakat'], ['description', 'Description', 'textarea'], ['url', 'URL', 'url'], ['category', 'Category', 'select', 'UtilitiesApplication', APP_CATS], ['os', 'Operating system', 'text', 'Any'],
        ['price', 'Price (0 if free)', 'number', '0'], ['currency', 'Currency', 'text', 'MYR'], ['ratingValue', 'Average rating (1–5)', 'number'], ['ratingCount', 'Number of ratings', 'number']],
      req: ['name', 'price'], rec: ['category', 'os', 'ratingValue'],
      build: function (v) {
        var price = num(v.price), rv = num(v.ratingValue), rc = num(v.ratingCount);
        return { '@type': v.category === 'GameApplication' ? 'VideoGame' : 'SoftwareApplication', name: trim(v.name), description: trim(v.description), url: trim(v.url), applicationCategory: v.category, operatingSystem: trim(v.os),
          offers: price !== undefined ? { '@type': 'Offer', price: price.toFixed(2), priceCurrency: trim(v.currency) || 'MYR' } : undefined,
          aggregateRating: rv !== undefined && rc ? { '@type': 'AggregateRating', ratingValue: rv, ratingCount: rc } : undefined };
      }
    },
    breadcrumb: {
      label: 'Breadcrumb', rich: 'The page path shown instead of the URL in results.',
      fields: [['items', 'One level per line: Name | URL (last line can skip the URL)', 'lines', 'Home | https://www.example.com/\nKalkulator | https://www.example.com/kalkulator/\nZakat Pendapatan']],
      req: ['items'], rec: [],
      build: function (v) {
        var l = lines(v.items);
        return { '@type': 'BreadcrumbList', itemListElement: l.map(function (s, i) { var p = s.split('|'); return { '@type': 'ListItem', position: i + 1, name: trim(p[0]), item: trim(p[1]) }; }) };
      }
    },
    website: {
      label: 'Website (site name)', rich: 'Helps Google show your preferred site name above results.',
      fields: [['name', 'Site name', 'text', 'The Bukit Besi'], ['alternateName', 'Other names (one per line)', 'lines', 'Bukit Besi Blog'], ['url', 'Home page URL', 'url', 'https://www.example.com/']],
      req: ['name', 'url'], rec: ['alternateName'],
      build: function (v) { return { '@type': 'WebSite', name: trim(v.name), alternateName: lines(v.alternateName), url: trim(v.url) }; }
    },
    faq: {
      label: 'FAQ', rich: 'No Google rich result since 7 May 2026; still read by Bing and AI assistants.',
      fields: [['qa', 'Questions and answers: question on the first line, answer below, blank line between pairs', 'textarea', 'Bila perlu bayar zakat pendapatan?\nSetiap bulan melalui potongan gaji, atau sekali setahun.\n\nBerapa kadar zakat pendapatan?\n2.5% daripada pendapatan yang layak.']],
      req: ['qa'], rec: [],
      build: function (v) {
        return { '@type': 'FAQPage', mainEntity: faqPairs(v.qa).map(function (p) { return { '@type': 'Question', name: p[0], acceptedAnswer: { '@type': 'Answer', text: p[1] } }; }) };
      }
    }
  };
  function faqPairs(v) {
    return trim(v).split(/\n\s*\n/).map(function (b) { var l = lines(b); return [l[0], l.slice(1).join(' ')]; }).filter(function (p) { return p[0] && p[1]; });
  }

  function defaults(type) {
    var o = { tz: '+08:00' };
    TYPES[type].fields.forEach(function (f) { o[f[0]] = f[3] != null ? f[3] : ''; });
    return o;
  }

  // Returns { json (object), text (pretty JSON), errors, warnings }.
  function generate(type, values) {
    var T = TYPES[type], v = Object.assign({}, values);
    if (T.prefill) { var pre = T.prefill(v); Object.keys(pre).forEach(function (k) { if (!trim(v[k])) v[k] = pre[k]; }); }
    var json = Object.assign({ '@context': 'https://schema.org' }, clean(T.build(v)) || {}), errors = [], warnings = [];
    var label = function (k) { var f = T.fields.filter(function (x) { return x[0] === k; })[0]; return f ? f[1] : k; };
    T.req.forEach(function (k) { if (!trim(v[k])) errors.push(label(k) + ' is required by Google.'); });
    T.rec.forEach(function (k) { if (!trim(v[k])) warnings.push(label(k) + ' is recommended.'); });
    T.fields.forEach(function (f) {
      var val = trim(v[f[0]]);
      if (!val) return;
      if (f[2] === 'url' && !isUrl(val)) errors.push(f[1] + ' must be a full URL starting with https://.');
      if (f[2] === 'lines' && /URLs \(one per line\)|profiles \(one per line\)/.test(f[1]) && lines(val).some(function (x) { return !isUrl(x); })) errors.push(f[1].replace(/ \(.*\)/, '') + ': every line must be a full URL.');
    });
    if (type === 'product' && num(v.price) === undefined && !(num(v.ratingValue) !== undefined && num(v.ratingCount))) errors.push('Add a price or a rating: Google needs offers, review or aggregateRating.');
    if (type === 'software' && !(num(v.ratingValue) !== undefined && num(v.ratingCount))) errors.push('Google shows app rich results only with a rating or review from real users.');
    if ((type === 'product' || type === 'recipe' || type === 'software') && num(v.ratingValue) !== undefined && (num(v.ratingValue) < 1 || num(v.ratingValue) > 5)) errors.push('Average rating must be between 1 and 5.');
    if (type === 'local' && badHours(v.hours).length) errors.push('Opening hours not understood: ' + badHours(v.hours).join('; ') + '. Use a format like Mon-Fri 09:00-18:00.');
    if (type === 'event' && v.mode !== 'OnlineEventAttendanceMode' && !trim(v.street)) errors.push('Venue street address is required for an in-person event.');
    if (type === 'event' && v.mode !== 'OfflineEventAttendanceMode' && !trim(v.online)) errors.push('Online event URL is required for an online event.');
    if (type === 'video' && trim(v.duration) && !duration(v.duration)) errors.push('Duration must look like 3:25 or 1:02:03.');
    if (type === 'breadcrumb' && lines(v.items).slice(0, -1).some(function (s) { return !isUrl((s.split('|')[1] || '').trim()); })) errors.push('Every breadcrumb level except the last needs a URL after |.');
    if (type === 'faq' && trim(v.qa) && !faqPairs(v.qa).length) errors.push('Write each question on one line with its answer on the next line.');
    return { json: json, text: JSON.stringify(json, null, 2), errors: errors, warnings: errors.length ? [] : warnings };
  }
  function scriptTag(text) { return '<script type="application/ld+json">\n' + text.replace(/<\/(script)/gi, '<\\/$1') + '\n</script>'; }

  // ---------------------------------------------------------------- HTML views shared by the build and the page
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function formHtml(type, values) {
    var T = TYPES[type], v = values || defaults(type);
    return T.fields.map(function (f) {
      var id = 'sf_' + f[0], req = T.req.indexOf(f[0]) >= 0 ? ' <span class="sc-req">required</span>' : '', val = v[f[0]] == null ? '' : v[f[0]], input;
      if (f[2] === 'select') input = '<select class="input" id="' + id + '" name="' + f[0] + '">' + f[4].map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
      else if (f[2] === 'textarea' || f[2] === 'lines') input = '<textarea class="prose-in short" id="' + id + '" name="' + f[0] + '" spellcheck="' + (f[2] === 'lines' ? 'false' : 'true') + '">' + esc(val) + '</textarea>';
      else input = '<input class="input" id="' + id + '" name="' + f[0] + '" type="' + ({ url: 'url', date: 'date', datetime: 'datetime-local', number: 'number' }[f[2]] || 'text') + '"' + (f[2] === 'number' ? ' step="any" inputmode="decimal"' : '') + ' value="' + esc(val) + '">';
      return '<div class="field' + (f[2] === 'textarea' || f[2] === 'lines' ? ' sc-wide' : '') + '"><label for="' + id + '">' + esc(f[1]) + req + '</label>' + input + '</div>';
    }).join('');
  }
  function checksHtml(r) {
    if (!r.errors.length && !r.warnings.length) return '<p class="sc-ok">✓ All properties Google requires and recommends are filled in.</p>';
    return '<ul class="sc-checks">' + r.errors.map(function (e) { return '<li class="no">' + esc(e) + '</li>'; }).join('') + r.warnings.map(function (w) { return '<li class="warn">' + esc(w) + '</li>'; }).join('') + '</ul>';
  }

  var api = {
    FACTS: FACTS, TYPES: TYPES, defaults: defaults, generate: generate, scriptTag: scriptTag, clean: clean, duration: duration, dateTime: dateTime, hours: hours, youtubeId: youtubeId,
    views: { formHtml: formHtml, checksHtml: checksHtml, esc: esc }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBSchema = api;
})(typeof self !== 'undefined' ? self : this);
