/* DedeFashion World — التطبيق (توجيه، صفحات، بحث، أسئلة، إدارة) */
(function () {
  'use strict';
  var CATS = window.DEDE_CATS, ARTS = window.DEDE_ARTICLES;
  var HERO_IMG = 'https://cdn.shopify.com/s/files/1/0389/9929/files/lao-textiles-2.jpg';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var app = $('#app');
  var catById = {}; CATS.forEach(function (c) { catById[c.id] = c; });
  var artById = {}; ARTS.forEach(function (a) { artById[a.id] = a; });

  /* ───── أدوات ───── */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) {
    return String(s).toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  function rose(cls) { return '<svg class="rose ' + (cls || '') + '" aria-hidden="true"><use href="#glass-rose"/></svg>'; }
  function toast(msg) {
    var t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  function imgSrc(a) { var c = catById[a.cat]; return a.img || (c && c.img) || ''; }
  function imgTag(src, alt) { return src ? '<img src="' + esc(src) + '" alt="' + esc(alt || '') + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : ''; }
  function phAttr(cat) { return 'cat-ph" data-g="' + esc((catById[cat] || {}).g || '✳'); }

  /* ───── مكونات ───── */
  function card(a) {
    var c = catById[a.cat];
    return '<article class="article-card reveal"><a class="card-image-wrap ' + phAttr(a.cat) + '" href="#/article/' + a.id + '" aria-label="' + esc(a.t) + '">' +
      imgTag(imgSrc(a), a.t) + '<span class="image-chip">' + esc(c.n) + '</span><span class="card-image-arrow">' + rose() + '</span></a>' +
      '<div class="card-copy"><div class="card-meta"><span>' + a.date + '</span><i></i><span>◷ ' + a.m + ' دقائق</span></div>' +
      '<h3><a href="#/article/' + a.id + '">' + esc(a.t) + '</a></h3><p>' + esc(a.d) + '</p>' +
      '<a class="rose-link" href="#/article/' + a.id + '" aria-label="افتحي المقال">' + rose() + '</a></div></article>';
  }
  function grid(list) { return '<div class="article-grid">' + list.map(card).join('') + '</div>'; }
  function heading(eyebrow, title, sub, link) {
    return '<div class="section-heading"><div><span class="eyebrow">' + eyebrow + '</span><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' +
      (link ? '<a class="text-link" href="' + link[0] + '">' + link[1] + ' ' + rose() + '</a>' : '') + '</div>';
  }

  /* ───── تحويل نص المقال إلى HTML ───── */
  function parseBody(text) {
    var lines = text.split('\n'), out = [], i = 0, toc = [], para = [];
    function flush() { if (para.length) { out.push('<p>' + esc(para.join(' ')) + '</p>'); para = []; } }
    while (i < lines.length) {
      var l = lines[i].trim();
      if (!l) { flush(); i++; continue; }
      if (l.indexOf('## ') === 0) {
        flush(); var id = 'h' + toc.length; toc.push([id, l.slice(3)]);
        out.push('<h2 id="' + id + '">' + esc(l.slice(3)) + '</h2>'); i++; continue;
      }
      if (l.charAt(0) === '|') {
        flush(); var rows = [];
        while (i < lines.length && lines[i].trim().charAt(0) === '|') {
          rows.push(lines[i].trim().replace(/^\||\|$/g, '').split('|').map(function (x) { return x.trim(); })); i++;
        }
        var h = '<div class="table-wrap"><table><thead><tr>' + rows[0].map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>';
        rows.slice(1).forEach(function (r) { h += '<tr>' + r.map(function (x) { return '<td>' + esc(x) + '</td>'; }).join('') + '</tr>'; });
        out.push(h + '</tbody></table></div>'); continue;
      }
      if (l.indexOf('- ') === 0) {
        flush(); var items = [];
        while (i < lines.length && lines[i].trim().indexOf('- ') === 0) { items.push(lines[i].trim().slice(2)); i++; }
        out.push('<ul>' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'); continue;
      }
      if (/^\d+\.\s/.test(l)) {
        flush(); var its = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) { its.push(lines[i].trim().replace(/^\d+\.\s/, '')); i++; }
        out.push('<ol>' + its.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>'); continue;
      }
      para.push(l); i++;
    }
    flush();
    return { html: out.join(''), toc: toc };
  }

  /* ───── الصفحات ───── */
  function pageHome() {
    var featured = artById['ART-004'] || ARTS[0];
    var latest = ['ART-005', 'ART-029', 'ART-033', 'ART-049', 'ART-022', 'ART-018'].map(function (id) { return artById[id]; }).filter(Boolean);
    var popular = ['ART-001', 'ART-029', 'ART-006', 'ART-049'].map(function (id) { return artById[id]; }).filter(Boolean);
    var strip = ['fashion', 'beauty', 'food', 'home'].map(function (id, i) {
      var c = catById[id];
      return '<a class="category-pill" href="#/category/' + id + '"><span>' + c.g + '</span><b>' + esc(c.n) + '</b>' + rose() + '</a>';
    }).join('');
    var feat4 = ['fashion', 'beauty', 'food', 'travel'].map(function (id, i) {
      var c = catById[id];
      return '<a href="#/category/' + id + '" class="category-feature-card ' + phAttr(id) + '">' + imgTag(c.img, c.n) + '<span class="category-feature-overlay"><small>0' + (i + 1) + ' / SECTION</small><strong>' + esc(c.n) + '</strong><span>' + esc(c.d) + '</span></span></a>';
    }).join('');
    return '' +
      '<section class="hero-section container"><div class="hero-copy"><div class="hero-kicker"><span class="sparkle-stamp">✳</span><span>YOUR DAILY DOSE OF LOVELY</span></div>' +
      '<h1>عالمكِ،<br><em>بأسلوبكِ.</em></h1><p>مساحة تلهمكِ لتعيشي يومكِ كما تحبين؛ من إطلالة تشبهكِ، إلى وصفة تجمع أحبابكِ، وأفكار صغيرة تصنع فرقًا كبيرًا.</p>' +
      '<div class="hero-actions"><a href="#/articles" class="button button-primary">اكتشفي الحكايات ' + rose() + '</a><a href="#/about" class="button button-quiet">حكاية Dede</a></div>' +
      '<div class="hero-note"><span class="note-avatars"><b>د</b><b>✿</b><b>♡</b></span><span>' + ARTS.length + ' مقالًا في ' + CATS.length + ' قسمًا<br><strong>كل ما يهمّكِ في مجلة واحدة</strong></span></div></div>' +
      '<div class="hero-visual"><div class="hero-photo-main"><img src="' + HERO_IMG + '" alt="نسيج وألوان من عالم الأزياء" referrerpolicy="no-referrer" onerror="this.remove()"><div class="hero-image-caption"><span>THE EDIT</span><span>اختيارات تستحق وقتكِ</span></div></div>' +
      '<div class="hero-orbit orbit-one"></div><div class="hero-orbit orbit-two"></div>' +
      '<div class="hero-floating-card"><span class="floating-icon">✿</span><div><small>مذكّرة ديدي</small><strong>لحظاتكِ الصغيرة<br>تستحق الاحتفاء</strong></div>' + rose() + '</div><span class="hero-photo-tag">A LITTLE MORE YOU</span></div></section>' +

      '<section class="category-strip container"><div class="category-strip-label"><span class="eyebrow">EXPLORE YOUR WORLD</span><strong>من أين نبدأ اليوم؟</strong></div>' + strip + '</section>' +

      '<section class="container section-space"><div class="reveal">' + heading('THE EDITOR\'S PICK', 'اختيرت لكِ بعناية', 'قراءة خفيفة، فكرة جديدة، أو معلومة تستحق أن تحتفظي بها.', ['#/articles', 'عرض الكل']) + '</div>' +
      '<div class="featured-layout reveal"><a href="#/article/' + featured.id + '" class="featured-large-image ' + phAttr(featured.cat) + '">' + imgTag(imgSrc(featured), featured.t) + '<span class="featured-image-label">✳ اختيار التحرير</span></a>' +
      '<div class="featured-content"><span class="category-overline">' + esc(catById[featured.cat].n) + ' / ' + featured.date + '</span><h3>' + esc(featured.t) + '</h3><p>' + esc(featured.d) + '</p>' +
      '<div class="featured-meta"><span>◷ ' + featured.m + ' دقائق قراءة</span><span>▤ من مجلة Dede</span></div><a class="rose-link" href="#/article/' + featured.id + '"><span>اقرئي الحكاية</span>' + rose('rose-big') + '</a></div></div></section>' +

      '<section class="latest-section section-space"><div class="container">' + heading('FRESHLY PICKED', 'الجديد في عالمنا', 'أحدث المقالات والأفكار، في مكان واحد.', ['#/articles', 'كل المقالات']) + grid(latest) + '</div></section>' +

      '<section class="quote-band container reveal"><div class="quote-flower">✿</div><span class="quote-mark">❝</span><blockquote>ليس عليكِ أن تكوني نسخة من أحد؛ أجمل التفاصيل هي تلك التي تشبهكِ.</blockquote><span>— من دفتر ديدي</span><div class="quote-star">✳</div></section>' +

      '<section class="category-feature-section container"><div class="category-feature-intro reveal"><span class="eyebrow">A WORLD OF IDEAS</span><h2 class="accent">كل جانب منكِ<br><em>له مساحة هنا.</em></h2><p>نؤمن أن الاهتمامات لا تأتي في خانة واحدة. تصفحي ما تحبين، واكتشفي موضوعًا جديدًا في كل زيارة.</p><a href="#/categories" class="text-link">تصفحي كل الأقسام ' + rose() + '</a></div><div class="category-feature-cards reveal">' + feat4 + '</div></section>' +

      '<section class="popular-section section-space"><div class="container popular-inner"><div class="reveal"><span class="eyebrow">LOVED BY READERS</span><h2 class="accent">الأكثر قراءة<br><em>هذا الأسبوع.</em></h2><p>موضوعات لفتت الانتباه، وأفكار عاد إليها القراء.</p><a href="#/articles" class="button button-dark">اكتشفي المزيد ' + rose() + '</a></div>' +
      '<div class="popular-list reveal">' + popular.map(function (a, i) {
        return '<a class="popular-item" href="#/article/' + a.id + '"><span class="popular-number">0' + (i + 1) + '</span><span class="thumb ' + phAttr(a.cat) + '">' + imgTag(imgSrc(a), '') + '</span><span class="popular-item-copy"><small>' + esc(catById[a.cat].n) + ' · ' + a.m + ' دقائق</small><strong>' + esc(a.t) + '</strong><span>' + a.date + '</span></span>' + rose() + '</a>';
      }).join('') + '</div></div></section>' +

      '<section class="ask-section container"><div class="ask-illustration reveal"><div class="ask-blob"><span>؟</span></div><span class="ask-sparkle ask-sparkle-a">✳</span><span class="ask-sparkle ask-sparkle-b">✿</span></div>' +
      '<div class="ask-copy reveal"><span class="eyebrow">LET\'S TALK ABOUT IT</span><h2 class="accent">عندكِ سؤال؟<br><em>مساحتكِ هنا.</em></h2><p>موضوع يشغلكِ، تجربة تودين فهمها، أو سؤال تتمنين إجابة واضحة عنه؟ أرسليه إلى ديدي، وقد يكون موضوعنا القادم.</p><a class="button button-primary" href="#/questions">اسألي ديدي ' + rose() + '</a><small>تُراجع الأسئلة قبل نشرها، حفاظًا على الخصوصية وجودة المحتوى.</small></div></section>' +
      '<section class="closing-note container"><span>♡</span><p>خذي ما يلهمكِ، واتركي ما لا يشبهكِ.</p><span class="closing-line"></span></section>';
  }

  var PAGE = 12;
  function pageArticles(params, forcedCat) {
    var q = params.q || '', cat = forcedCat || params.cat || '', savedOnly = params.saved === '1';
    var inner = '';
    inner += '<div class="article-controls"><label class="article-search"><span>⌕</span><input id="listSearch" value="' + esc(q) + '" placeholder="ابحثي في المقالات..." aria-label="بحث في المقالات"></label><div class="filter-chips" id="chips">' +
      '<button data-chip="" class="' + (!cat && !savedOnly ? 'active' : '') + '">الكل</button>' +
      '<button data-chip="saved" class="' + (savedOnly ? 'active' : '') + '">♡ المحفوظة</button>' +
      CATS.map(function (c) { return '<button data-chip="' + c.id + '" class="' + (cat === c.id ? 'active' : '') + '">' + esc(c.n) + '</button>'; }).join('') + '</div></div>';
    inner += '<div id="listOut"></div>';
    return { html: inner };
  }
  function filterList(params, forcedCat) {
    var q = norm(params.q || ''), cat = forcedCat || params.cat || '', saved = store.get('dede_saved', []);
    return ARTS.filter(function (a) {
      if (cat && a.cat !== cat) return false;
      if (params.saved === '1' && saved.indexOf(a.id) < 0) return false;
      if (!q) return true;
      return norm(a.t + ' ' + a.d + ' ' + a.sub + ' ' + a.body + ' ' + catById[a.cat].n).indexOf(q) >= 0;
    });
  }
  var shown = PAGE;
  function renderList(params, forcedCat) {
    var out = $('#listOut'); if (!out) return;
    var list = filterList(params, forcedCat);
    if (!list.length) {
      out.innerHTML = '<div class="empty-state"><div style="font-size:42px;color:var(--lav)">✿</div><h2>لم نعثر على مقالات مطابقة</h2><p>جرّبي كلمة أخرى أو قسمًا مختلفًا.</p></div>'; return;
    }
    out.innerHTML = '<div class="inner-section-top"><h2>' + list.length + ' مقالًا</h2><span>مرتبة حسب أحدث ترتيب</span></div>' + grid(list.slice(0, shown)) +
      (list.length > shown ? '<div class="load-more"><button class="button button-quiet" id="moreBtn">عرض المزيد ' + rose() + '</button></div>' : '');
    reveal();
  }
  function viewArticles(params) {
    shown = PAGE;
    app.innerHTML = '<div class="container inner-page"><div class="page-intro"><span class="eyebrow">THE MAGAZINE</span><h1>كل المقالات</h1><p>مقالات بمصادر واضحة، في كل ما يهمّكِ.</p></div>' + pageArticles(params).html + '</div>';
    renderList(params);
    bindList(params);
  }
  function bindList(params, forcedCat) {
    var inp = $('#listSearch');
    if (inp) inp.addEventListener('input', function () { params.q = inp.value; shown = PAGE; renderList(params, forcedCat); });
    var chips = $('#chips');
    if (chips) chips.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var v = b.getAttribute('data-chip');
      if (forcedCat) { location.hash = v && v !== 'saved' ? '#/category/' + v : '#/articles' + (v === 'saved' ? '?saved=1' : ''); return; }
      params.cat = v === 'saved' ? '' : v; params.saved = v === 'saved' ? '1' : '';
      $$('button', chips).forEach(function (x) { x.classList.toggle('active', x === b); });
      shown = PAGE; renderList(params);
    });
    app.onclick = function (e) {
      if (e.target.closest && e.target.closest('#moreBtn')) { shown += PAGE; renderList(params, forcedCat); }
    };
  }

  function viewCategories() {
    app.innerHTML = '<div class="container inner-page"><div class="page-intro"><span class="eyebrow">ALL SECTIONS</span><h1>كل الأقسام</h1><p>' + CATS.length + ' قسمًا، اختاري ما يلهمكِ.</p></div><div class="category-grid">' +
      CATS.map(function (c) {
        var n = ARTS.filter(function (a) { return a.cat === c.id; }).length;
        return '<a class="cat-card reveal" href="#/category/' + c.id + '"><span class="g">' + c.g + '</span><strong>' + esc(c.n) + '</strong><p>' + esc(c.d) + '</p><span class="count"><span>' + n + ' مقالات</span>' + rose() + '</span></a>';
      }).join('') + '</div></div>';
    reveal();
  }

  function viewCategory(id) {
    var c = catById[id]; if (!c) return view404();
    shown = PAGE;
    var params = {};
    app.innerHTML = '<div class="container inner-page"><div class="category-page-hero"><div><span class="eyebrow">' + c.en + '</span><h1 class="hero-h1 accent"><em>' + esc(c.n) + '</em></h1><p>' + esc(c.d) + '</p></div><div class="category-hero-image ' + phAttr(id) + '">' + imgTag(c.img, c.n) + '</div></div>' + pageArticles(params, id).html + '</div>';
    renderList(params, id);
    bindList(params, id);
  }

  function viewArticle(id) {
    var a = artById[id]; if (!a) return view404();
    var c = catById[a.cat], saved = store.get('dede_saved', []).indexOf(a.id) >= 0;
    var b = parseBody(a.body);
    var medical = ['health', 'nutrition', 'beauty', 'hair'].indexOf(a.cat) >= 0;
    var related = ARTS.filter(function (x) { return x.cat === a.cat && x.id !== a.id; }).slice(0, 3);
    if (related.length < 3) related = related.concat(ARTS.filter(function (x) { return x.cat !== a.cat; }).slice(0, 3 - related.length));
    var srcHtml = a.src.length ?
      '<section class="sources-box"><h2>المصادر والمراجع</h2><p>اطلعي على الجهات التي استندنا إليها.</p><ol>' + a.src.map(function (s) {
        return '<li><a href="' + esc(s[2]) + '" target="_blank" rel="noopener noreferrer">' + esc(s[0]) + '</a> <span>— ' + esc(s[1]) + '</span></li>';
      }).join('') + '</ol></section>' :
      '<section class="sources-box"><h2>المصادر والمراجع</h2><p>سنضيف مراجع موثقة لهذا المقال قبل النشر الرسمي.</p></section>';
    document.title = a.t + ' — DedeFashion World';
    app.innerHTML = '<div class="container article-page">' +
      '<nav class="breadcrumbs" aria-label="مسار التنقل"><a href="#/">الرئيسية</a><span>/</span><a href="#/category/' + c.id + '">' + esc(c.n) + '</a><span>/</span><span>' + esc(a.sub) + '</span></nav>' +
      '<header class="article-header"><span class="article-category-label">' + esc(c.n) + '</span><h1>' + esc(a.t) + '</h1><p class="article-deck">' + esc(a.d) + '</p>' +
      '<div class="article-byline"><span class="author-avatar">د</span><span>فريق Dede</span><span>·</span><span>' + a.date + '</span><span>·</span><span>◷ ' + a.m + ' دقائق</span></div></header>' +
      '<figure class="article-cover ' + phAttr(a.cat) + '" style="margin-bottom:0">' + imgTag(imgSrc(a), a.t) + '</figure>' +
      '<div class="article-layout"><div><article class="article-body">' +
      (a.rev ? '<div class="notice notice-warn"><span>✦</span><span>هذا المقال قيد المراجعة التحريرية: مصادره تحتاج تدقيقًا قبل النشر الرسمي.</span></div>' : '') +
      b.html +
      (medical ? '<div class="notice notice-info"><span>✿</span><span>المحتوى للتوعية العامة وليس تشخيصًا أو بديلًا عن استشارة الطبيب أو المختص.</span></div>' : '') +
      '</article>' + srcHtml +
      '<div class="article-share"><span>أعجبكِ المقال؟</span><div><button class="chip-btn ' + (saved ? 'on' : '') + '" data-act="save" data-id="' + a.id + '">' + (saved ? '★ محفوظ' : '♡ احفظيه') + '</button><button class="chip-btn" data-act="copy">نسخ الرابط</button>' +
      (navigator.share ? '<button class="chip-btn" data-act="share" data-t="' + esc(a.t) + '">مشاركة</button>' : '') + '<button class="chip-btn" data-act="print">طباعة</button></div></div></div>' +
      '<aside class="article-aside">' +
      (b.toc.length ? '<div class="aside-card toc"><h3>في هذا المقال</h3>' + b.toc.map(function (t) { return '<button data-act="toc" data-id="' + t[0] + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>' : '') +
      '<div class="aside-card aside-about"><span style="font-size:28px;color:var(--gold)">✿</span><h3>عالمٌ يشبهكِ</h3><p>مجلة تجمع الفاشون والجمال والبيت والحياة في مكان واحد.</p><a class="rose-link" href="#/about"><span>تعرفي علينا</span>' + rose() + '</a></div>' +
      '<div class="aside-card" style="background:var(--lav-soft)"><strong>سؤال لديدي؟</strong><p style="font-size:12px;color:#7d68a3;line-height:1.9">أرسلي سؤالكِ وقد يكون موضوعنا القادم.</p><a class="rose-link" href="#/questions"><span>اسألي ديدي</span>' + rose() + '</a></div></aside></div>' +
      '<section class="related-section"><h2>قد يعجبكِ أيضًا</h2>' + grid(related) + '</section></div>';
    reveal();
  }

  var SEED_FAQ = [
    ['كم مرة أغسل فرش المكياج؟', 'ينصح أخصائيو الجلد بغسلها مرة واحدة أسبوعيًا على الأقل بماء فاتر وشامبو لطيف.', 'ART-010'],
    ['هل أحتاج واقي الشمس في الأيام الغائمة؟', 'نعم، فجزء كبير من الأشعة فوق البنفسجية يخترق السحب. اختاري واقيًا واسع الطيف وأعيدي وضعه كل ساعتين عند التعرض للشمس.', 'ART-006'],
    ['كم ساعة نوم يحتاجها البالغ؟', 'توصي المصادر الطبية بنحو 7–9 ساعات ليلًا مع جدول نوم ثابت قدر الإمكان.', 'ART-022'],
    ['متى أغسل شعري بعد الصبغة؟', 'يُنصح بالانتظار 48–72 ساعة ليثبت اللون، ثم استخدام شامبو للشعر المصبوغ وماء فاتر.', 'ART-014']
  ];
  function viewQuestions() {
    var pub = store.get('dede_questions', []).filter(function (x) { return x.status === 'published'; });
    var faq = SEED_FAQ.map(function (f) { return { q: f[0], a: f[1], link: f[2] }; })
      .concat(pub.map(function (x) { return { q: x.text, a: x.answer, tag: x.topic }; }));
    var topics = ['فاشون', 'جمال وعناية', 'صحة وتغذية', 'مطبخ ووصفات', 'البيت والأسرة', 'سفر وثقافة', 'أخرى'];
    app.innerHTML = '<div class="container inner-page" style="padding-top:37px"><div class="questions-hero"><div><span class="eyebrow">DEDE ANSWERS</span><h1 class="hero-h1 accent">اسألي <em>ديدي</em></h1><p>ما الذي يشغلكِ؟ أرسلي سؤالكِ، وسنراجعه بعناية وقد نجيب عنه في مقال أو في هذه الصفحة.</p>' +
      '<div class="questions-points"><span><b>✦</b> مراجعة قبل النشر</span><span><b>✦</b> خصوصية محفوظة</span><span><b>✦</b> إجابات بمصادر</span></div></div>' +
      '<div class="question-art"><div class="question-art-card"><span>؟</span><strong>Ask <em>Dede</em></strong><small>مساحتكِ للأسئلة</small></div></div></div>' +
      '<div class="questions-layout"><div class="question-form-panel"><span class="eyebrow">SEND A QUESTION</span><h2>أرسلي سؤالكِ</h2><p>يمكنكِ استخدام اسم مستعار.</p>' +
      '<form class="stack-form" id="qForm"><label>الاسم أو اسم مستعار<input name="name" required maxlength="40"></label>' +
      '<label>البريد الإلكتروني <span class="optional-label">(اختياري)</span><input name="email" type="email"></label>' +
      '<label>الموضوع<select name="topic">' + topics.map(function (t) { return '<option>' + t + '</option>'; }).join('') + '</select></label>' +
      '<label>سؤالكِ<textarea name="text" rows="5" required minlength="8" maxlength="600" placeholder="اكتبي سؤالكِ هنا..."></textarea></label>' +
      '<div class="privacy-note"><b>✦</b><span>لا نعرض بريدكِ الإلكتروني. تُراجع الأسئلة قبل النشر.</span></div>' +
      '<button class="button button-primary" type="submit">إرسال السؤال ' + rose() + '</button><div class="notice notice-ok" id="qOk" hidden><span>✿</span><span>وصل سؤالكِ، شكرًا لكِ!</span></div></form></div>' +
      '<div class="answered-panel"><div class="answered-panel-heading"><span class="eyebrow">ANSWERED</span><h2>أسئلة أُجيب عنها</h2><p>مختارات من أسئلة القارئات.</p></div>' +
      faq.map(function (f) {
        return '<details class="faq-item"><summary>' + esc(f.q) + '</summary><div class="faq-answer"><p>' + esc(f.a) + '</p>' + (f.link ? '<a class="rose-link" href="#/article/' + f.link + '"><span>اقرئي المقال</span>' + rose() + '</a>' : '') + '</div></details>';
      }).join('') + '<div class="editorial-note"><span>✦</span><span>المعلومات الصحية للتوعية فقط ولا تغني عن استشارة مختص.</span></div></div></div></div>';
    $('#qForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target, list = store.get('dede_questions', []);
      list.unshift({ id: 'q' + Date.now(), name: f.name.value.trim(), email: f.email.value.trim(), topic: f.topic.value, text: f.text.value.trim(), date: new Date().toLocaleDateString('ar-SA'), status: 'pending', answer: '' });
      store.set('dede_questions', list); f.reset(); $('#qOk').hidden = false;
    });
  }

  function viewAbout() {
    app.innerHTML = '<div class="container inner-page" style="padding-top:48px"><div class="about-hero"><div class="about-hero-text"><span class="eyebrow">ABOUT DEDE</span><h1 class="hero-h1 accent">مجلة تشبهكِ،<br><em>بتفاصيلها.</em></h1>' +
      '<p>DedeFashion World مساحة عربية تجمع الفاشون والجمال والصحة والمطبخ والبيت ونمط الحياة. نكتب بلغة قريبة، ونحرص على أن تستند معلوماتنا إلى مصادر واضحة.</p><a class="button button-primary" href="#/articles">تصفحي المجلة ' + rose() + '</a></div>' +
      '<div class="about-visual cat-ph" data-g="✿"><img src="' + HERO_IMG + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()"></div></div>' +
      '<div class="about-values"><div><span>01</span><h2>معلومة موثوقة</h2><p>نذكر مصادرنا في كل مقال، ونعلّم ما يحتاج مراجعة قبل النشر.</p></div><div><span>02</span><h2>ذوق هادئ</h2><p>ألوان مريحة للعين، وتفاصيل بسيطة تشبه القارئة.</p></div><div><span>03</span><h2>مساحة للحوار</h2><p>أسئلتكِ تصنع موضوعاتنا القادمة.</p></div></div>' +
      '<div class="about-bottom"><div style="font-size:42px;color:var(--gold)">✿</div><h2>رسالة من ديدي</h2><p>خذي ما يلهمكِ، واتركي ما لا يشبهكِ.</p><a class="button button-dark" href="#/questions">اسألي ديدي ' + rose() + '</a></div></div>';
  }

  /* ───── الإدارة (واجهة تجريبية تعمل على متصفح المتصفحة فقط) ───── */
  function viewAdmin() {
    var ok = false; try { ok = sessionStorage.getItem('dede_admin') === '1'; } catch (e) {}
    if (!ok) {
      app.innerHTML = '<div class="container inner-page"><div class="admin-wrap" style="max-width:460px"><div class="admin-card"><span class="eyebrow">EDITOR ACCESS</span><h2>دخول إدارة المحتوى</h2>' +
        '<div class="notice notice-info"><span>✦</span><span>هذه لوحة تجريبية تعمل داخل المتصفح فقط. قبل الإطلاق الفعلي يجب ربطها بخادم وحماية حقيقية.</span></div>' +
        '<form class="stack-form" id="loginForm"><label>كلمة المرور<input class="login-input" type="password" name="pw" required autocomplete="current-password"></label><button class="button button-primary" type="submit">دخول ' + rose() + '</button><div class="notice notice-warn" id="loginErr" hidden><span>كلمة المرور غير صحيحة.</span></div></form></div></div></div>';
      $('#loginForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var pw = store.get('dede_admin_pw', 'dede2026');
        if (e.target.pw.value === pw) { try { sessionStorage.setItem('dede_admin', '1'); } catch (x) {} viewAdmin(); }
        else $('#loginErr').hidden = false;
      });
      return;
    }
    var qs = store.get('dede_questions', []), subs = store.get('dede_subs', []);
    app.innerHTML = '<div class="container inner-page"><div class="admin-wrap"><div class="admin-toolbar"><div><span class="eyebrow">DEDE ADMIN</span><h1 style="margin:6px 0 0;font-size:32px">إدارة المحتوى</h1></div><div style="display:flex;gap:8px"><button class="button button-quiet button-sm" data-act="export">تصدير JSON</button><button class="button button-dark button-sm" data-act="logout">خروج</button></div></div>' +
      '<div class="admin-stat-grid"><div><span>المقالات</span><strong>' + ARTS.length + '</strong></div><div><span>الأقسام</span><strong>' + CATS.length + '</strong></div><div><span>أسئلة بانتظار المراجعة</span><strong>' + qs.filter(function (x) { return x.status === 'pending'; }).length + '</strong></div><div><span>المشتركات</span><strong>' + subs.length + '</strong></div></div>' +
      '<div class="admin-card"><h2>أسئلة القارئات</h2>' + (qs.length ? qs.map(function (x) {
        return '<div class="moderation-card" data-q="' + x.id + '"><div class="mod-meta"><span class="status-pill status-' + x.status + '">' + (x.status === 'published' ? 'منشور' : 'بانتظار المراجعة') + '</span><span>' + esc(x.topic) + '</span><span>' + esc(x.name) + '</span><span>' + esc(x.date) + '</span>' + (x.email ? '<span dir="ltr">' + esc(x.email) + '</span>' : '') + '</div><h3>' + esc(x.text) + '</h3>' +
          '<label class="answer-label">الإجابة<textarea rows="3">' + esc(x.answer) + '</textarea></label><div class="mod-actions"><button class="button button-primary button-sm" data-act="publish" data-id="' + x.id + '">حفظ ونشر</button>' + (x.status === 'published' ? '<button class="button button-quiet button-sm" data-act="unpublish" data-id="' + x.id + '">إلغاء النشر</button>' : '') + '<button class="button button-quiet button-sm" data-act="delq" data-id="' + x.id + '">حذف</button></div></div>';
      }).join('') : '<div class="empty-note">لا توجد أسئلة بعد.</div>') + '</div>' +
      '<div class="admin-card"><h2>المشتركات في النشرة</h2>' + (subs.length ? '<ul>' + subs.map(function (s) { return '<li dir="ltr" style="text-align:right">' + esc(s) + '</li>'; }).join('') + '</ul>' : '<div class="empty-note">لا توجد اشتراكات بعد.</div>') + '</div>' +
      '<div class="admin-card"><h2>تغيير كلمة المرور</h2><form class="stack-form" id="pwForm"><label>كلمة مرور جديدة<input class="login-input" type="password" name="pw" required minlength="6"></label><button class="button button-quiet button-sm" type="submit">حفظ</button></form></div></div></div>';
    $('#pwForm').addEventListener('submit', function (e) { e.preventDefault(); store.set('dede_admin_pw', e.target.pw.value); e.target.reset(); toast('تم تغيير كلمة المرور'); });
  }

  function view404() {
    app.innerHTML = '<div class="container inner-page not-found"><div class="not-found-number">404</div><h1>لم نجد هذه الصفحة</h1><p style="color:#8f808b">ربما انتقلت، أو أن الرابط غير صحيح.</p><a class="button button-primary" href="#/">العودة للرئيسية ' + rose() + '</a></div>';
  }

  /* ───── التوجيه ───── */
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, ''), qi = h.indexOf('?'), path = qi >= 0 ? h.slice(0, qi) : h, qs = qi >= 0 ? h.slice(qi + 1) : '', params = {};
    qs.split('&').forEach(function (p) { if (!p) return; var kv = p.split('='); params[kv[0]] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); });
    return { parts: path.split('/').filter(Boolean), params: params };
  }
  function setActive(name) {
    $$('#mainNav a').forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-nav') === name); });
  }
  function route() {
    var r = parseHash(), p = r.parts, name = p[0] || 'home';
    document.title = 'DedeFashion World — عالمكِ، بأسلوبكِ';
    $('#mainNav').classList.remove('nav-open'); $('#menuToggle').setAttribute('aria-expanded', 'false');
    $('#progress').style.width = '0';
    if (name === 'home') viewHomeRender();
    else if (name === 'articles') viewArticles(r.params);
    else if (name === 'categories') viewCategories();
    else if (name === 'category') viewCategory(p[1]);
    else if (name === 'article') viewArticle(p[1]);
    else if (name === 'questions') viewQuestions();
    else if (name === 'about') viewAbout();
    else if (name === 'admin') viewAdmin();
    else view404();
    setActive(name === 'article' ? 'articles' : name);
    window.scrollTo(0, 0);
    reveal();
    app.focus({ preventScroll: true });
  }
  function viewHomeRender() { app.innerHTML = pageHome(); }

  function reveal() {
    var els = $$('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }); }, { rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ───── أحداث عامة ───── */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]'); if (!t) return;
    var act = t.getAttribute('data-act'), id = t.getAttribute('data-id');
    if (act === 'save') {
      var s = store.get('dede_saved', []), i = s.indexOf(id);
      if (i >= 0) s.splice(i, 1); else s.push(id);
      store.set('dede_saved', s); var on = s.indexOf(id) >= 0;
      t.classList.toggle('on', on); t.textContent = on ? '★ محفوظ' : '♡ احفظيه'; toast(on ? 'تم حفظ المقال' : 'أُزيل من المحفوظات');
    } else if (act === 'copy') {
      var url = location.href;
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { toast('تم نسخ الرابط'); }, function () { toast(url); });
      else toast(url);
    } else if (act === 'share') { navigator.share({ title: t.getAttribute('data-t'), url: location.href }).catch(function () {}); }
    else if (act === 'print') window.print();
    else if (act === 'toc') { var h = document.getElementById(id); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (act === 'logout') { try { sessionStorage.removeItem('dede_admin'); } catch (x) {} viewAdmin(); }
    else if (act === 'export') {
      var data = JSON.stringify({ questions: store.get('dede_questions', []), subscribers: store.get('dede_subs', []) }, null, 2);
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = 'dede-data.json'; a.click();
    } else if (act === 'publish' || act === 'unpublish' || act === 'delq') {
      var qs = store.get('dede_questions', []), q = qs.filter(function (x) { return x.id === id; })[0]; if (!q) return;
      if (act === 'delq') { qs = qs.filter(function (x) { return x.id !== id; }); }
      else if (act === 'publish') {
        var ans = t.closest('.moderation-card').querySelector('textarea').value.trim();
        if (!ans) { toast('اكتبي الإجابة أولًا'); return; }
        q.answer = ans; q.status = 'published';
      } else q.status = 'pending';
      store.set('dede_questions', qs); viewAdmin(); toast('تم الحفظ');
    }
  });

  $('#menuToggle').addEventListener('click', function () {
    var n = $('#mainNav'); var o = n.classList.toggle('nav-open'); this.setAttribute('aria-expanded', o ? 'true' : 'false');
  });
  $('#searchToggle').addEventListener('click', function () {
    var p = $('#searchPanel'); p.hidden = !p.hidden; if (!p.hidden) $('#searchInput').focus();
  });
  $('#searchForm').addEventListener('submit', function (e) {
    e.preventDefault(); var v = $('#searchInput').value.trim();
    location.hash = '#/articles' + (v ? '?q=' + encodeURIComponent(v) : ''); $('#searchPanel').hidden = true;
  });
  $('#newsletterForm').addEventListener('submit', function (e) {
    e.preventDefault(); var em = e.target.querySelector('input').value.trim(), s = store.get('dede_subs', []);
    if (s.indexOf(em) < 0) s.push(em);
    store.set('dede_subs', s); e.target.reset(); $('#newsMsg').textContent = 'شكرًا لكِ! سجّلنا بريدكِ.';
  });
  window.addEventListener('scroll', function () {
    var bar = $('#progress'), art = $('.article-body');
    if (!art) { bar.style.width = '0'; return; }
    var r = art.getBoundingClientRect(), total = r.height - window.innerHeight * .6;
    bar.style.width = Math.max(0, Math.min(100, (-r.top / Math.max(total, 1)) * 100)) + '%';
  }, { passive: true });
  window.addEventListener('hashchange', route);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { $('#searchPanel').hidden = true; $('#mainNav').classList.remove('nav-open'); } });

  route();
})();
