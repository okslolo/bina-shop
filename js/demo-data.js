// Dati di esempio usati SOLO quando Supabase non è ancora configurato,
// così puoi vedere subito il sito completo. Stessa forma delle tabelle SQL.
(function () {
  var v = window.SAB_CONFIG.vintedUrl;

  window.SAB_DEMO = {
    categories: [
      { id: 1, name: "Abiti", slug: "abiti" },
      { id: 2, name: "Top & Camicie", slug: "top-camicie" },
      { id: 3, name: "Gonne & Pantaloni", slug: "gonne-pantaloni" },
      { id: 4, name: "Giacche & Cappotti", slug: "giacche-cappotti" },
      { id: 5, name: "Borse", slug: "borse" },
      { id: 6, name: "Accessori", slug: "accessori" },
      { id: 7, name: "Scarpe", slug: "scarpe" },
    ],

    products: [
      { id: 1, title: "Abito midi a fiori in chiffon", description: "Leggero e fluido, perfetto per le giornate di primavera. Ottime condizioni.", price: 24, image_url: null, vinted_url: v, category: "abiti", likes: 23, created_at: "2026-10-08T10:00:00Z" },
      { id: 2, title: "Camicia in seta color cipria", description: "Taglio morbido e tessuto setoso, si abbina a tutto.", price: 18, image_url: null, vinted_url: v, category: "top-camicie", likes: 14, created_at: "2026-10-07T10:00:00Z" },
      { id: 3, title: "Blazer vintage doppiopetto", description: "Spalle strutturate e linea pulita: un classico che non passa mai di moda.", price: 32, image_url: null, vinted_url: v, category: "giacche-cappotti", likes: 31, created_at: "2026-10-06T10:00:00Z" },
      { id: 4, title: "Gonna plissé effetto argento", description: "Plissettatura lunga con riflessi satinati. Taglia unica regolabile in vita.", price: 20, image_url: null, vinted_url: v, category: "gonne-pantaloni", likes: 9, created_at: "2026-10-05T10:00:00Z" },
      { id: 5, title: "Borsa a tracolla in pelle rosa", description: "Compatta ma capiente, con tracolla regolabile e chiusura a calamita.", price: 28, image_url: null, vinted_url: v, category: "borse", likes: 18, created_at: "2026-10-04T10:00:00Z" },
      { id: 6, title: "Foulard in seta vintage", description: "Stampa delicata su fondo chiaro: ideale al collo, in testa o sulla borsa.", price: 12, image_url: null, vinted_url: v, category: "accessori", likes: 6, created_at: "2026-10-03T10:00:00Z" },
      { id: 7, title: "Ballerine nude con fiocco", description: "Comode e raffinate, usate pochissimo.", price: 15, image_url: null, vinted_url: v, category: "scarpe", likes: 4, created_at: "2026-10-02T10:00:00Z" },
      { id: 8, title: "Jeans a vita alta lavaggio chiaro", description: "Vestibilità dritta e vita alta, denim morbido.", price: 22, image_url: null, vinted_url: v, category: "gonne-pantaloni", likes: 12, created_at: "2026-10-01T10:00:00Z" },
    ],
  };
})();
