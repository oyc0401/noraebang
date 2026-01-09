/**
 * TJ 미디어 HTML 디버깅 스크립트
 *
 * 기능:
 * - TJ 미디어 웹페이지의 HTML을 다운로드하여 /tmp/tj-debug.html에 저장
 * - HTML 구조 분석 및 파싱 로직 개발용
 *
 * 사용법:
 * npx tsx src/thirdparty/tj/script/debug-html.ts
 */

import * as fs from "node:fs";

async function main() {
  const artistName = "아이유";
  const params = new URLSearchParams({
    pageNo: "1",
    pageRowCnt: "15",
    strSotrGubun: "ASC",
    strSortType: "",
    nationType: "",
    strType: "2",
    searchTxt: artistName,
  });

  const url = `https://www.tjmedia.com/song/accompaniment_search?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
    },
  });

  const html = await res.text();

  // Save to file
  const outputPath = "/tmp/tj-debug.html";
  fs.writeFileSync(outputPath, html);

  console.log(`HTML saved to: ${outputPath}`);
  console.log(`HTML length: ${html.length}`);
  console.log(`\nFirst 2000 characters:`);
  console.log(html.substring(0, 2000));
}

main();
