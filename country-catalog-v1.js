(() => {
  "use strict";
  const CODES = ['AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW'];
  const ALIASES = {
    BR: ["brasil", "brazil"], PT: ["portugal"], PL: ["polonia", "polônia", "poland"],
    ES: ["espanha", "spain"], NL: ["paises baixos", "países baixos", "holanda", "netherlands"],
    US: ["usa", "eua", "estados unidos", "united states"], GB: ["uk", "reino unido", "inglaterra", "united kingdom"],
    DE: ["alemanha", "germany"], FR: ["franca", "frança", "france"], IT: ["italia", "itália", "italy"],
    JP: ["japao", "japão", "japan"], KR: ["coreia do sul", "south korea"], CN: ["china"],
  };
  const names = new Intl.DisplayNames(["pt-PT"], { type: "region" });
  const englishNames = new Intl.DisplayNames(["en"], { type: "region" });
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const flag = (code) => /^[A-Z]{2}$/.test(code || "")
    ? String.fromCodePoint(...code.split("").map((letter) => 127397 + letter.charCodeAt(0)))
    : "🌍";
  const countries = CODES.map((code) => Object.freeze({
    code,
    name: names.of(code) || code,
    englishName: englishNames.of(code) || code,
    flag: flag(code),
    aliases: Object.freeze(ALIASES[code] || []),
  })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const byCode = new Map(countries.map((country) => [country.code, country]));
  const resolve = (value) => {
    const raw = String(value || "").trim();
    const direct = byCode.get(raw.toUpperCase());
    if (direct) return direct;
    const needle = normalize(raw);
    return countries.find((country) =>
      normalize(country.name) === needle || normalize(country.englishName) === needle || country.aliases.some((alias) => normalize(alias) === needle),
    ) || null;
  };
  const search = (query, limit = 12) => {
    const needle = normalize(query);
    if (!needle) return countries.slice(0, limit);
    const score = (country) => {
      const code = normalize(country.code);
      const name = normalize(country.name);
      const englishName = normalize(country.englishName);
      const aliases = country.aliases.map(normalize);
      if (code === needle) return 0;
      if (name === needle || englishName === needle || aliases.includes(needle)) return 1;
      if (code.startsWith(needle) || aliases.some((alias) => alias.startsWith(needle))) return 2;
      if (name.startsWith(needle) || englishName.startsWith(needle)) return 3;
      if (name.includes(needle) || englishName.includes(needle) || aliases.some((alias) => alias.includes(needle))) return 4;
      return 99;
    };
    return countries.map((country) => ({ country, rank: score(country) }))
      .filter((item) => item.rank < 99)
      .sort((a, b) => a.rank - b.rank || a.country.name.localeCompare(b.country.name, "pt-BR"))
      .slice(0, limit).map((item) => item.country);
  };
  window.TeamCountryCatalog = Object.freeze({ countries, byCode, normalize, flag, resolve, search });
})();
