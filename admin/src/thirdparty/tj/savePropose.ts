interface TJSaveProposeParams {
  dtCode: string;
  singer: string;
  title: string;
  name: string;
  content: string;
  email1: string;
  email2: string;
}

export async function saveTJPropose(
  params: TJSaveProposeParams,
): Promise<any | null> {
  const cookie =
    "_ga=GA1.1.1167659956.1766025282; __utmc=65568875; CSRF_TOKEN=0+f0MmnkOx/s8mnqrvyh00N/KP+hQu6L9XE16uhODF8=; JSESSIONID=DBBC74F1DFB5EC005A9AFA42E056ECA7; __utma=65568875.128089706.1766025282.1767524166.1767945578.25; __utmz=65568875.1767945578.25.5.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); __utmt=1; __utmb=65568875.9.10.1767945578; _ga_EJ9J62LWMR=GS2.1.s1767945579$o30$g1$t1767946565$j37$l0$h0";
  const csrfToken = "0+f0MmnkOx/s8mnqrvyh00N/KP+hQu6L9XE16uhODF8=";

  const headers = {
    accept: "*/*",
    "accept-encoding": "gzip, deflate, br, zstd",
    "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    cookie: cookie,
    origin: "https://www.tjmedia.com",
    referer: "https://www.tjmedia.com/song/propose",
    "sec-ch-ua":
      '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    "x-csrf-token": csrfToken,
    "x-requested-with": "XMLHttpRequest",
  };

  console.log("\n[Request URL]", "https://www.tjmedia.com/song/save_propose");
  console.log("[Request Method]", "POST");
  console.log("[Request Headers]", headers);
  console.log("[Request Body]", {
    dt_code: params.dtCode,
    po_song_singer: params.singer,
    po_song_title: params.title,
    po_name: params.name,
    po_content: params.content,
    po_email1: params.email1,
    po_email2: params.email2,
  });

  const res = await fetch("https://www.tjmedia.com/song/save_propose", {
    method: "POST",
    headers: headers,
    body: new URLSearchParams({
      dt_code: params.dtCode,
      po_song_singer: params.singer,
      po_song_title: params.title,
      po_name: params.name,
      po_content: params.content,
      po_email1: params.email1,
      po_email2: params.email2,
    }),
  });

  console.log("\n[Response Status]", res.status, res.statusText);
  console.log("[Response Headers]", Object.fromEntries(res.headers.entries()));

  const text = await res.text();
  console.log("[Response Body Length]", text.length);
  console.log("[Response Body Preview]", text.substring(0, 500));

  if (!res.ok) {
    console.error("❌ HTTP request failed");
    return null;
  }

  try {
    const json = JSON.parse(text);
    console.log("✅ JSON parsing success");
    return json;
  } catch (error) {
    console.error("❌ JSON parsing failed - response is not JSON");
    console.error("[Full Response Body]", text);
    return null;
  }
}
