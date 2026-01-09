// npx tsx src/thirdparty/tj/script/sendPropose.ts

/**
 * TJ Media에 노래 신청을 보내는 스크립트
 * proposeData 객체에 신청할 노래 정보를 입력하고 실행하면 자동으로 신청됩니다.
 */

import { saveTJPropose } from "../savePropose";

// 여기에 데이터를 직접 입력하세요
const proposeData = {
  singer: "ロクデナシ",
  title: "イオ",
  name: "헤쿠2",
  content: "너무 부르고싶어요",
  email1: "oyc0401",
  email2: "gmail.com",
};

async function main() {
  console.log("Sending propose to TJ Media...");
  console.log(proposeData);

  try {
    const result = await saveTJPropose({
      dtCode: "30",
      ...proposeData,
    });

    if (result === null) {
      console.error("\n❌ Failed to send propose - API returned invalid response");
      process.exit(1);
    }

    console.log("\n✅ Success!");
    console.log("Response:", result);
  } catch (error) {
    console.error("\n❌ Failed to send propose");
    console.error(error);
    process.exit(1);
  }
}

main();
