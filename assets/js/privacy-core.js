/* Privacy Policy Generator core. Builds a privacy notice in English, Bahasa Melayu or both from the site's answers.
   Sections follow the Personal Data Protection Commissioner's "framework of a notice" for the PDPA 2010 (Malaysia),
   with the statements Google requires for AdSense and Google Analytics and, when chosen, GDPR rights.
   UMD: module.exports in Node, window.TBBPrivacy in the browser. */
(function (root) {
  'use strict';
  var FACTS = { verified: '2026-10-19' };
  var DEFAULTS = {
    site: 'Example Blog', url: 'https://www.example.com', owner: 'Ali bin Abu', email: 'hello@example.com', address: '',
    date: '2026-10-19', lang: 'both', gdpr: true, children: true,
    collect: { contact: true, comments: true, newsletter: false, accounts: false, orders: false },
    services: { adsense: true, analytics: true, affiliate: false, embeds: true, cdn: false }
  };
  var LINKS = {
    adsSettings: 'https://adssettings.google.com/', aboutads: 'https://www.aboutads.info/choices/',
    partners: 'https://policies.google.com/technologies/partner-sites', gaOptout: 'https://tools.google.com/dlpage/gaoptout',
    googlePrivacy: 'https://policies.google.com/privacy'
  };

  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  // Text uses [label](url) links and {placeholders}; both are expanded per output format.
  function fill(s, o) {
    return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; });
  }
  // "a", "a or b", "a, b or c"
  function join(items, word) { return items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' ' + word + ' ' + items[items.length - 1]; }
  function longDate(iso, lang) {
    var d = new Date(iso + 'T00:00:00Z');
    if (isNaN(d)) return iso;
    var M = lang === 'ms' ? ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return d.getUTCDate() + ' ' + M[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
  }

  // One entry per section: [id, title, function (o) -> array of paragraphs; an array inside is a bullet list].
  var TEXT = {
    en: {
      title: 'Privacy Policy',
      updated: 'Last updated: {dateText}',
      sections: [
        ['intro', 'About this policy', function (o) {
          return ['This privacy policy explains how {owner} ("we", "us") collects, uses and protects your personal data when you visit {site} at {url}. It is written to meet the notice requirements of the Personal Data Protection Act 2010 (Malaysia)' + (o.gdpr ? ' and the EU General Data Protection Regulation (GDPR) for visitors in the European Economic Area' : '') + '. By using this website you acknowledge this policy.'];
        }],
        ['data', 'Personal data we collect', function (o) {
          var c = o.collect, list = [];
          if (c.contact) list.push('Your name, email address and message when you use the contact form.');
          if (c.comments) list.push('Your name, email address, website and comment when you leave a comment.');
          if (c.newsletter) list.push('Your email address when you subscribe to our newsletter.');
          if (c.accounts) list.push('Your account details such as username, email address and password (stored encrypted).');
          if (c.orders) list.push('Your name, phone number, delivery address and order details when you buy from us. Card payments are handled by our payment provider; we do not store your card number.');
          list.push('Technical data collected automatically: IP address, browser and device type, pages visited, time spent, and the website that referred you, through cookies and server logs.');
          return ['We collect the following personal data:', list];
        }],
        ['sources', 'How we collect it', function (o) {
          var list = ['Directly from you, when you ' + join(['fill in a form'].concat(o.collect.comments ? ['leave a comment'] : [], o.collect.orders ? ['place an order'] : []), 'or') + '.', 'Automatically, through cookies and similar technologies when you browse the website.'];
          if (o.services.adsense || o.services.analytics) list.push('From third parties such as Google, which provide our advertising and analytics services.');
          return [list];
        }],
        ['purposes', 'Why we use your data', function (o) {
          var list = ['To run, secure and improve the website.'];
          if (o.collect.contact || o.collect.comments) list.push('To reply to your messages and publish your comments.');
          if (o.collect.newsletter) list.push('To send you our newsletter, which you can unsubscribe from at any time.');
          if (o.collect.accounts) list.push('To create and manage your account.');
          if (o.collect.orders) list.push('To process, deliver and support your orders, and to meet our accounting and tax obligations.');
          if (o.services.analytics) list.push('To understand how visitors use the website, through Google Analytics.');
          if (o.services.adsense) list.push('To show advertising that helps keep this website free.');
          list.push('To comply with the law and respond to lawful requests from authorities.');
          var out = [list];
          if (o.gdpr) out.push('For visitors in the European Economic Area, our legal bases are your consent (for cookies, advertising and newsletters), our legitimate interests (running and securing the website and replying to you), contract (for orders and accounts) and legal obligations.');
          return out;
        }],
        ['cookies', 'Cookies and advertising', function (o) {
          var out = ['Cookies are small files stored on your device. We use them to remember your preferences' + (o.services.analytics ? ', measure traffic' : '') + (o.services.adsense ? ' and show advertising' : '') + '. You can block or delete cookies in your browser settings; some features may then not work.'];
          if (o.services.adsense) {
            out.push('This website shows ads from Google AdSense. Third party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites. Google\'s use of advertising cookies enables it and its partners to serve ads to you based on your visit to this website and/or other websites on the Internet.');
            out.push('You may opt out of personalized advertising by visiting [Google Ads Settings](' + LINKS.adsSettings + '). You can also opt out of some third-party vendors\' use of cookies for personalized advertising at [www.aboutads.info](' + LINKS.aboutads + '). Learn more about [how Google uses information from sites that use its services](' + LINKS.partners + ').');
          }
          return out;
        }],
        ['analytics', 'Analytics', function (o) {
          if (!o.services.analytics) return null;
          return ['We use Google Analytics to understand how visitors use this website. Google Analytics uses cookies to collect information such as pages visited, time on site, device and approximate location; it does not tell us who you are. The data is processed by Google under the [Google Privacy Policy](' + LINKS.googlePrivacy + '). You can prevent your data from being used by Google Analytics by installing the [Google Analytics opt-out browser add-on](' + LINKS.gaOptout + ').'];
        }],
        ['disclosure', 'Who we share your data with', function (o) {
          var list = ['Service providers who host and run the website' + (o.services.cdn ? ', including our content delivery network,' : '') + ' and process data only on our instructions.'];
          if (o.services.adsense || o.services.analytics) list.push('Google, for advertising and analytics as described above.');
          if (o.collect.orders) list.push('Payment providers and delivery companies, to complete your order.');
          if (o.collect.newsletter) list.push('Our email newsletter provider, to send the newsletter.');
          list.push('Government agencies, regulators or courts when the law requires it.');
          return ['We do not sell your personal data. We share it only with:', list];
        }],
        ['transfer', 'Transfers outside Malaysia', function () {
          return ['Some of our service providers, including Google, store data on servers outside Malaysia. When your data is transferred abroad we take reasonable steps to ensure it is protected to a standard similar to the Personal Data Protection Act 2010.'];
        }],
        ['security', 'How we protect your data', function () {
          return ['We use HTTPS encryption, access controls and reputable service providers to protect your personal data from loss, misuse, unauthorised access and disclosure. No method of transmission over the Internet is completely secure, so we cannot guarantee absolute security.'];
        }],
        ['retention', 'How long we keep it', function (o) {
          return ['We keep personal data only as long as needed for the purposes above' + (o.collect.orders ? ', and order records for as long as accounting and tax laws require' : '') + '. Messages are deleted when no longer needed' + (o.collect.comments ? '; published comments stay until you ask us to remove them' : '') + '.'];
        }],
        ['rights', 'Your rights', function (o) {
          var list = ['Access the personal data we hold about you and ask us to correct it if it is inaccurate, incomplete or out of date.', 'Withdraw your consent and ask us to limit or stop processing your data, for example by unsubscribing or blocking cookies.'];
          if (o.gdpr) list.push('If you are in the European Economic Area, you also have the right to erasure, restriction, data portability and to object to processing, and to complain to your local data protection authority.');
          return ['You have the right to:', list, 'To use these rights, email us at {email}. We may need to verify your identity before acting on your request.'];
        }],
        ['obligatory', 'Is giving your data required?', function (o) {
          return ['Giving us personal data is voluntary. If you do not provide the details a form asks for, we may not be able to reply to you' + (o.collect.orders ? ', process your order' : '') + (o.collect.accounts ? ' or create your account' : '') + '. You can browse the website without giving us your name or email address. If you do give us personal data, please make sure it is accurate and tell us if it changes.'];
        }],
        ['children', 'Children', function (o) {
          if (!o.children) return null;
          return ['This website is not directed at children under 13. We do not knowingly collect personal data from children. If you believe a child has given us personal data, contact us and we will delete it.'];
        }],
        ['links', 'Links to other websites', function (o) {
          var out = ['This website links to other websites. We are not responsible for their content or privacy practices; please read their privacy policies.'];
          if (o.services.affiliate) out.push('Some links are affiliate links: if you buy through them we may earn a commission at no extra cost to you. The retailer may use cookies to record the referral.');
          if (o.services.embeds) out.push('Pages may include embedded content such as YouTube videos or social media posts, which behaves as if you visited the other website and may set its own cookies.');
          return out;
        }],
        ['changes', 'Changes to this policy', function () {
          return ['We may update this policy from time to time. The date at the top shows when it was last changed. Significant changes will be announced on this website.'];
        }],
        ['contact', 'Contact us', function (o) {
          return ['If you have any questions about this policy or your personal data, contact {owner} at {email}' + (o.address ? ', ' + o.address : '') + '.'];
        }]
      ]
    },
    ms: {
      title: 'Dasar Privasi',
      updated: 'Dikemas kini: {dateText}',
      sections: [
        ['intro', 'Tentang dasar ini', function (o) {
          return ['Dasar privasi ini menerangkan cara {owner} ("kami") mengumpul, menggunakan dan melindungi data peribadi anda apabila anda melawat {site} di {url}. Dasar ini disediakan bagi memenuhi keperluan notis Akta Perlindungan Data Peribadi 2010 (Malaysia)' + (o.gdpr ? ' dan Peraturan Perlindungan Data Am Kesatuan Eropah (GDPR) bagi pelawat di Kawasan Ekonomi Eropah' : '') + '. Dengan menggunakan laman web ini, anda mengakui dasar ini.'];
        }],
        ['data', 'Data peribadi yang kami kumpul', function (o) {
          var c = o.collect, list = [];
          if (c.contact) list.push('Nama, alamat e-mel dan mesej anda apabila anda menggunakan borang hubungan.');
          if (c.comments) list.push('Nama, alamat e-mel, laman web dan komen anda apabila anda meninggalkan komen.');
          if (c.newsletter) list.push('Alamat e-mel anda apabila anda melanggan surat berita kami.');
          if (c.accounts) list.push('Butiran akaun anda seperti nama pengguna, alamat e-mel dan kata laluan (disimpan secara tersulit).');
          if (c.orders) list.push('Nama, nombor telefon, alamat penghantaran dan butiran pesanan anda apabila anda membeli daripada kami. Bayaran kad dikendalikan oleh penyedia pembayaran kami; kami tidak menyimpan nombor kad anda.');
          list.push('Data teknikal yang dikumpul secara automatik: alamat IP, jenis pelayar dan peranti, halaman yang dilawati, tempoh lawatan dan laman web yang merujuk anda, melalui kuki dan log pelayan.');
          return ['Kami mengumpul data peribadi berikut:', list];
        }],
        ['sources', 'Cara kami mengumpulnya', function (o) {
          var list = ['Terus daripada anda, apabila anda ' + join(['mengisi borang'].concat(o.collect.comments ? ['meninggalkan komen'] : [], o.collect.orders ? ['membuat pesanan'] : []), 'atau') + '.', 'Secara automatik, melalui kuki dan teknologi seumpamanya semasa anda melayari laman web ini.'];
          if (o.services.adsense || o.services.analytics) list.push('Daripada pihak ketiga seperti Google, yang menyediakan perkhidmatan pengiklanan dan analitik kami.');
          return [list];
        }],
        ['purposes', 'Tujuan kami menggunakan data anda', function (o) {
          var list = ['Untuk mengendali, melindungi dan menambah baik laman web ini.'];
          if (o.collect.contact || o.collect.comments) list.push('Untuk membalas mesej anda dan menyiarkan komen anda.');
          if (o.collect.newsletter) list.push('Untuk menghantar surat berita kami, yang boleh anda berhenti langgan pada bila-bila masa.');
          if (o.collect.accounts) list.push('Untuk membuka dan mengurus akaun anda.');
          if (o.collect.orders) list.push('Untuk memproses, menghantar dan menyokong pesanan anda, serta memenuhi kewajipan perakaunan dan cukai kami.');
          if (o.services.analytics) list.push('Untuk memahami cara pelawat menggunakan laman web ini, melalui Google Analytics.');
          if (o.services.adsense) list.push('Untuk memaparkan iklan yang membantu laman web ini kekal percuma.');
          list.push('Untuk mematuhi undang-undang dan menjawab permintaan sah daripada pihak berkuasa.');
          var out = [list];
          if (o.gdpr) out.push('Bagi pelawat di Kawasan Ekonomi Eropah, asas undang-undang kami ialah persetujuan anda (untuk kuki, iklan dan surat berita), kepentingan sah kami (mengendali dan melindungi laman web serta membalas anda), kontrak (untuk pesanan dan akaun) dan kewajipan undang-undang.');
          return out;
        }],
        ['cookies', 'Kuki dan pengiklanan', function (o) {
          var out = ['Kuki ialah fail kecil yang disimpan pada peranti anda. Kami menggunakannya untuk mengingati pilihan anda' + (o.services.analytics ? ', mengukur trafik' : '') + (o.services.adsense ? ' dan memaparkan iklan' : '') + '. Anda boleh menyekat atau memadam kuki melalui tetapan pelayar anda; sesetengah ciri mungkin tidak berfungsi selepas itu.'];
          if (o.services.adsense) {
            out.push('Laman web ini memaparkan iklan daripada Google AdSense. Vendor pihak ketiga, termasuk Google, menggunakan kuki untuk memaparkan iklan berdasarkan lawatan anda sebelum ini ke laman web ini atau laman web lain. Penggunaan kuki pengiklanan oleh Google membolehkan Google dan rakan kongsinya memaparkan iklan kepada anda berdasarkan lawatan anda ke laman web ini dan/atau laman web lain di Internet.');
            out.push('Anda boleh menarik diri daripada pengiklanan diperibadikan melalui [Tetapan Iklan Google](' + LINKS.adsSettings + '). Anda juga boleh menarik diri daripada penggunaan kuki oleh sesetengah vendor pihak ketiga untuk pengiklanan diperibadikan di [www.aboutads.info](' + LINKS.aboutads + '). Ketahui lebih lanjut tentang [cara Google menggunakan maklumat daripada laman yang menggunakan perkhidmatannya](' + LINKS.partners + ').');
          }
          return out;
        }],
        ['analytics', 'Analitik', function (o) {
          if (!o.services.analytics) return null;
          return ['Kami menggunakan Google Analytics untuk memahami cara pelawat menggunakan laman web ini. Google Analytics menggunakan kuki untuk mengumpul maklumat seperti halaman yang dilawati, tempoh lawatan, peranti dan anggaran lokasi; ia tidak memberitahu kami siapa anda. Data ini diproses oleh Google di bawah [Dasar Privasi Google](' + LINKS.googlePrivacy + '). Anda boleh menghalang data anda daripada digunakan oleh Google Analytics dengan memasang [alat tambah pelayar untuk menarik diri daripada Google Analytics](' + LINKS.gaOptout + ').'];
        }],
        ['disclosure', 'Pihak yang menerima data anda', function (o) {
          var list = ['Penyedia perkhidmatan yang mengehos dan mengendalikan laman web ini' + (o.services.cdn ? ', termasuk rangkaian penghantaran kandungan kami,' : '') + ' dan memproses data hanya atas arahan kami.'];
          if (o.services.adsense || o.services.analytics) list.push('Google, untuk pengiklanan dan analitik seperti yang diterangkan di atas.');
          if (o.collect.orders) list.push('Penyedia pembayaran dan syarikat penghantaran, untuk melengkapkan pesanan anda.');
          if (o.collect.newsletter) list.push('Penyedia surat berita e-mel kami, untuk menghantar surat berita.');
          list.push('Agensi kerajaan, pengawal selia atau mahkamah apabila dikehendaki oleh undang-undang.');
          return ['Kami tidak menjual data peribadi anda. Kami hanya berkongsinya dengan:', list];
        }],
        ['transfer', 'Pemindahan ke luar Malaysia', function () {
          return ['Sesetengah penyedia perkhidmatan kami, termasuk Google, menyimpan data pada pelayan di luar Malaysia. Apabila data anda dipindahkan ke luar negara, kami mengambil langkah munasabah untuk memastikan ia dilindungi pada tahap yang setara dengan Akta Perlindungan Data Peribadi 2010.'];
        }],
        ['security', 'Cara kami melindungi data anda', function () {
          return ['Kami menggunakan penyulitan HTTPS, kawalan akses dan penyedia perkhidmatan yang bereputasi untuk melindungi data peribadi anda daripada kehilangan, salah guna, akses tanpa kebenaran dan pendedahan. Tiada kaedah penghantaran melalui Internet yang selamat sepenuhnya, jadi kami tidak dapat menjamin keselamatan mutlak.'];
        }],
        ['retention', 'Tempoh kami menyimpan data', function (o) {
          return ['Kami menyimpan data peribadi selama yang diperlukan untuk tujuan di atas sahaja' + (o.collect.orders ? ', dan rekod pesanan selama yang dikehendaki oleh undang-undang perakaunan dan cukai' : '') + '. Mesej dipadam apabila tidak lagi diperlukan' + (o.collect.comments ? '; komen yang disiarkan kekal sehingga anda meminta kami memadamnya' : '') + '.'];
        }],
        ['rights', 'Hak anda', function (o) {
          var list = ['Mengakses data peribadi yang kami simpan tentang anda dan meminta kami membetulkannya jika ia tidak tepat, tidak lengkap atau sudah lapuk.', 'Menarik balik persetujuan anda dan meminta kami mengehadkan atau menghentikan pemprosesan data anda, contohnya dengan berhenti melanggan atau menyekat kuki.'];
          if (o.gdpr) list.push('Jika anda berada di Kawasan Ekonomi Eropah, anda juga berhak meminta data dipadam, mengehadkan pemprosesan, kemudahalihan data dan membantah pemprosesan, serta membuat aduan kepada pihak berkuasa perlindungan data tempatan anda.');
          return ['Anda berhak untuk:', list, 'Untuk menggunakan hak ini, e-mel kami di {email}. Kami mungkin perlu mengesahkan identiti anda sebelum bertindak atas permintaan anda.'];
        }],
        ['obligatory', 'Adakah anda wajib memberikan data?', function (o) {
          return ['Memberikan data peribadi kepada kami adalah secara sukarela. Jika anda tidak memberikan butiran yang diminta oleh borang, kami mungkin tidak dapat membalas anda' + (o.collect.orders ? ', memproses pesanan anda' : '') + (o.collect.accounts ? ' atau membuka akaun anda' : '') + '. Anda boleh melayari laman web ini tanpa memberikan nama atau alamat e-mel anda. Jika anda memberikan data peribadi, sila pastikan ia tepat dan maklumkan kepada kami jika ia berubah.'];
        }],
        ['children', 'Kanak-kanak', function (o) {
          if (!o.children) return null;
          return ['Laman web ini tidak ditujukan kepada kanak-kanak di bawah umur 13 tahun. Kami tidak sengaja mengumpul data peribadi daripada kanak-kanak. Jika anda percaya seorang kanak-kanak telah memberikan data peribadi kepada kami, hubungi kami dan kami akan memadamnya.'];
        }],
        ['links', 'Pautan ke laman web lain', function (o) {
          var out = ['Laman web ini mengandungi pautan ke laman web lain. Kami tidak bertanggungjawab atas kandungan atau amalan privasi laman tersebut; sila baca dasar privasi mereka.'];
          if (o.services.affiliate) out.push('Sesetengah pautan ialah pautan afiliasi: jika anda membeli melaluinya, kami mungkin menerima komisen tanpa kos tambahan kepada anda. Peruncit mungkin menggunakan kuki untuk merekodkan rujukan tersebut.');
          if (o.services.embeds) out.push('Halaman mungkin mengandungi kandungan terbenam seperti video YouTube atau hantaran media sosial, yang berkelakuan seolah-olah anda melawat laman web tersebut dan mungkin menetapkan kukinya sendiri.');
          return out;
        }],
        ['changes', 'Perubahan pada dasar ini', function () {
          return ['Kami mungkin mengemas kini dasar ini dari semasa ke semasa. Tarikh di bahagian atas menunjukkan bila ia terakhir diubah. Perubahan penting akan dimaklumkan di laman web ini.'];
        }],
        ['contact', 'Hubungi kami', function (o) {
          return ['Jika anda mempunyai sebarang pertanyaan tentang dasar ini atau data peribadi anda, hubungi {owner} di {email}' + (o.address ? ', ' + o.address : '') + '.'];
        }]
      ]
    }
  };

  function merge(o) {
    o = o || {};
    var r = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      var d = DEFAULTS[k];
      r[k] = d && typeof d === 'object' ? Object.assign({}, d, o[k] || {}) : (o[k] != null && o[k] !== '' ? o[k] : d);
    });
    if (r.lang !== 'en' && r.lang !== 'ms' && r.lang !== 'both') r.lang = 'both';
    return r;
  }

  // Returns [{ lang, title, updated, sections: [{ id, h, blocks: [string | string[]] }] }], one per language.
  function generate(opts) {
    var o = merge(opts), langs = o.lang === 'both' ? ['en', 'ms'] : [o.lang];
    return langs.map(function (lang) {
      var T = TEXT[lang], vars = { site: o.site, url: o.url, owner: o.owner, email: o.email, dateText: longDate(o.date, lang) };
      var sections = T.sections.map(function (s) {
        var blocks = s[2](o);
        return blocks ? { id: s[0], h: s[1], blocks: blocks.map(function (b) { return Array.isArray(b) ? b.map(function (x) { return fill(x, vars); }) : fill(b, vars); }) } : null;
      }).filter(Boolean);
      return { lang: lang, title: T.title, updated: fill(T.updated, vars), sections: sections };
    });
  }

  function inlineHtml(s) {
    return esc(s).replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" rel="nofollow noopener">$1</a>');
  }
  // Heading levels start at `level` (2 by default) so the policy fits under a page title.
  function html(docs, level) {
    var h = level || 2;
    return docs.map(function (d) {
      return '<section lang="' + (d.lang === 'ms' ? 'ms' : 'en') + '">\n<h' + h + '>' + esc(d.title) + '</h' + h + '>\n<p><em>' + esc(d.updated) + '</em></p>\n' +
        d.sections.map(function (s) {
          return '<h' + (h + 1) + '>' + esc(s.h) + '</h' + (h + 1) + '>\n' + s.blocks.map(function (b) {
            return Array.isArray(b) ? '<ul>\n' + b.map(function (x) { return '<li>' + inlineHtml(x) + '</li>'; }).join('\n') + '\n</ul>' : '<p>' + inlineHtml(b) + '</p>';
          }).join('\n');
        }).join('\n') + '\n</section>';
    }).join('\n<hr>\n');
  }
  function markdown(docs) {
    return docs.map(function (d) {
      return '# ' + d.title + '\n\n*' + d.updated + '*\n\n' + d.sections.map(function (s) {
        return '## ' + s.h + '\n\n' + s.blocks.map(function (b) { return Array.isArray(b) ? b.map(function (x) { return '- ' + x; }).join('\n') : b; }).join('\n\n');
      }).join('\n\n');
    }).join('\n\n---\n\n') + '\n';
  }
  function text(docs) {
    return markdown(docs).replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)').replace(/^#+ /gm, '').replace(/^\*(.*)\*$/gm, '$1');
  }
  // Problems worth fixing before publishing.
  function check(opts) {
    var o = merge(opts), p = [];
    if (!/^https?:\/\/[^\s.]+\.[^\s]+$/.test(o.url)) p.push('url');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) p.push('email');
    if (o.site === DEFAULTS.site || o.email === DEFAULTS.email || o.owner === DEFAULTS.owner) p.push('placeholder');
    return p;
  }

  var api = { FACTS: FACTS, DEFAULTS: DEFAULTS, LINKS: LINKS, TEXT: TEXT, merge: merge, generate: generate, html: html, markdown: markdown, text: text, check: check, longDate: longDate, esc: esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TBBPrivacy = api;
})(typeof self !== 'undefined' ? self : this);
