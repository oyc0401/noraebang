import { parseTJArtist } from "./artist-parser";

//    pnpm test artist-parser.spec.ts

// 괄호제거하면 안되는 이유:
//   영재(4MEN) - 포맨 영재
//   영재(B.A.P) - 비에이피 영재
//   영재(GOT7) - 갓세븐 영재

describe("parseTJArtist", () => {
  describe("기본 케이스", () => {
    it("빈 문자열은 빈 배열을 반환해야 함", () => {
      const result = parseTJArtist("");
      expect(result).toEqual({
        artist: [],
        feature: [],
        producer: [],
      });
    });

    it("공백만 있는 문자열은 빈 배열을 반환해야 함", () => {
      const result = parseTJArtist("   ");
      expect(result).toEqual({
        artist: [],
        feature: [],
        producer: [],
      });
    });

    it("단일 아티스트는 정상적으로 파싱되어야 함", () => {
      const result = parseTJArtist("아이유");
      expect(result).toEqual({
        artist: ["아이유"],
        feature: [],
        producer: [],
      });
    });
  });

  describe("쉼표로 구분된 여러 아티스트", () => {
    it("쉼표로 구분된 여러 아티스트를 모두 추출해야 함", () => {
      const result = parseTJArtist("먼데이키즈,유회승,방예담,우디");
      expect(result).toEqual({
        artist: ["먼데이키즈", "유회승", "방예담", "우디"],
        feature: [],
        producer: [],
      });
    });

    it("5명의 아티스트를 모두 추출해야 함 (실제 예시)", () => {
      const result = parseTJArtist("먼데이키즈,DK(디셈버),유회승,방예담,우디");
      expect(result).toEqual({
        artist: ["먼데이키즈", "DK(디셈버)", "유회승", "방예담", "우디"],
        feature: [],
        producer: [],
      });
    });
  });

  describe("괄호 안 별명/본명 포함", () => {
    it("괄호는 아티스트명에 포함되어야 함", () => {
      const result = parseTJArtist("빅나티(서동현),키드밀리");
      expect(result).toEqual({
        artist: ["빅나티(서동현)", "키드밀리"],
        feature: [],
        producer: [],
      });
    });

    it("여러 개의 괄호가 있어도 모두 유지되어야 함", () => {
      const result = parseTJArtist("DK(디셈버),BE'O(비오)");
      expect(result).toEqual({
        artist: ["DK(디셈버)", "BE'O(비오)"],
        feature: [],
        producer: [],
      });
    });

    it("괄호 안에 쉼표가 있는 경우 정상적으로 파싱되어야 함", () => {
      const result = parseTJArtist("허용별(허각,신용재,임한별)");
      expect(result).toEqual({
        artist: ["허용별(허각,신용재,임한별)"],
        feature: [],
        producer: [],
      });
    });

    it("괄호 안에 쉼표가 있는 여러 아티스트", () => {
      const result = parseTJArtist(
        "허용별(허각,신용재,임한별),아이유,빅나티(서동현)",
      );
      expect(result).toEqual({
        artist: ["허용별(허각,신용재,임한별)", "아이유", "빅나티(서동현)"],
        feature: [],
        producer: [],
      });
    });

    it("특정 번역 괄호는 제거되어야 함", () => {
      const result = parseTJArtist("브로큰발렌타인(Broken Valentine)");
      expect(result).toEqual({
        artist: ["브로큰발렌타인"],
        feature: [],
        producer: [],
      });
    });

    it("특정 그룹명 멤버 목록이 오면 그룹명만 유지해야 함 (BTOB, TWICE)", () => {
      const result = parseTJArtist("BTOB(이민혁,프니엘,정일훈)");
      expect(result).toEqual({
        artist: ["BTOB"],
        feature: [],
        producer: [],
      });
    });
  });

  describe("피처링 (Feat.) 처리", () => {
    it("단일 피처링 아티스트를 추출해야 함", () => {
      const result = parseTJArtist("여로(Feat.이효운)");
      expect(result).toEqual({
        artist: ["여로"],
        feature: ["이효운"],
        producer: [],
      });
    });

    it("피처링 안에 여러 아티스트가 있으면 모두 추출해야 함", () => {
      const result = parseTJArtist("아티스트(Feat.피처링1,피처링2,피처링3)");
      expect(result).toEqual({
        artist: ["아티스트"],
        feature: ["피처링1", "피처링2", "피처링3"],
        producer: [],
      });
    });

    it("별명 괄호와 피처링이 함께 있으면 정상적으로 파싱되어야 함", () => {
      const result = parseTJArtist("BE'O(비오)(Feat.김필선)");
      expect(result).toEqual({
        artist: ["BE'O(비오)"],
        feature: ["김필선"],
        producer: [],
      });
    });

    it("괄호 밖 Feat. 키워드도 피처링으로 처리되어야 함", () => {
      const result = parseTJArtist("Kuh Ledesma feat. Gary Valenciano");
      expect(result).toEqual({
        artist: ["Kuh Ledesma"],
        feature: ["Gary Valenciano"],
        producer: [],
      });
    });

    it("Duet. 은 Feat. 과 동일하게 처리되어야 함", () => {
      const result = parseTJArtist("박재정(Duet.규현)");
      expect(result).toEqual({
        artist: ["박재정"],
        feature: ["규현"],
        producer: [],
      });
    });

    it("Duet With 은 피처링으로 처리되어야 함", () => {
      const result = parseTJArtist("김동률(Duet With 이소은)");
      expect(result).toEqual({
        artist: ["김동률"],
        feature: ["이소은"],
        producer: [],
      });
    });

    it("With 은 피처링으로 처리되어야 함", () => {
      const result = parseTJArtist("바이브(With 벤(Ben))");
      expect(result).toEqual({
        artist: ["바이브"],
        feature: ["벤(Ben)"],
        producer: [],
      });
    });

    it("With. 은 피처링으로 처리되어야 함", () => {
      const result = parseTJArtist("후이(With.장혜진)");
      expect(result).toEqual({
        artist: ["후이"],
        feature: ["장혜진"],
        producer: [],
      });
    });

    it("With. 은 다른 아티스트 케이스에서도 피처링 처리되어야 함", () => {
      const result = parseTJArtist("권순관(With.남우현)");
      expect(result).toEqual({
        artist: ["권순관"],
        feature: ["남우현"],
        producer: [],
      });
    });

    it("여러 아티스트 케이스에서도 With. 은 피처링 처리되어야 함", () => {
      const result = parseTJArtist("이창섭(With.린)");
      expect(result).toEqual({
        artist: ["이창섭"],
        feature: ["린"],
        producer: [],
      });
    });
    it("앞에 한국어가 있어도 Duet. 은 피처링으로 처리되어야 함", () => {
      const result = parseTJArtist("브라운아이즈(Duet.장혜진)");
      expect(result).toEqual({
        artist: ["브라운아이즈"],
        feature: ["장혜진"],
        producer: [],
      });
    });

    it("겁표 뒤에 점 대신 콤마가 와도 피처링으로 처리되어야 함", () => {
      const result = parseTJArtist("Beyonce(Feat,Jay-Z)");
      expect(result).toEqual({
        artist: ["Beyonce"],
        feature: ["Jay-Z"],
        producer: [],
      });
    });

    it("닫히지 않은 Feat 괄호도 피처링으로 처리되어야 함", () => {
      const result = parseTJArtist("지코(Feat.루나(F(X))");
      expect(result).toEqual({
        artist: ["지코"],
        feature: ["루나(F(X))"],
        producer: [],
      });
    });

    it("Rap. 도 피처링으로 처리되어야 함", () => {
      const result = parseTJArtist("마야(Rap.상추)");
      expect(result).toEqual({
        artist: ["마야"],
        feature: ["상추"],
        producer: [],
      });
    });

    it("Special Ment. 도 피처링으로 처리되어야 함", () => {
      const result = parseTJArtist("여행스케치(Special Ment. 엄앵란)");
      expect(result).toEqual({
        artist: ["여행스케치"],
        feature: ["엄앵란"],
        producer: [],
      });
    });

    it("Narr. 도 피처링으로 처리되어야 함", () => {
      const result = parseTJArtist("다비치(Narr.하하)");
      expect(result).toEqual({
        artist: ["다비치"],
        feature: ["하하"],
        producer: [],
      });
    });

    it("닫히지 않은 Narr. 괄호도 피처링으로 처리되어야 함", () => {
      const result = parseTJArtist("HYNN(박혜원)(Narr.SBS");
      expect(result).toEqual({
        artist: ["HYNN(박혜원)"],
        feature: ["SBS"],
        producer: [],
      });
    });

    it("Sung By 도 피처링으로 처리되어야 함", () => {
      const result = parseTJArtist(
        "S.M. THE BALLAD(Sung By 종현(샤이니),CHEN(EXO))",
      );
      expect(result).toEqual({
        artist: ["S.M. THE BALLAD"],
        feature: ["종현(샤이니)", "CHEN(EXO)"],
        producer: [],
      });
    });

    it("By 는 참여 멤버 목록으로 처리되어야 함", () => {
      const result = parseTJArtist(
        "tripleS(트리플에스)(By 나경,마유,시온,채원)",
      );
      expect(result).toEqual({
        artist: ["tripleS(트리플에스)"],
        feature: ["나경", "마유", "시온", "채원"],
        producer: [],
      });
    });

    it("Piano by 도 피처링처럼 처리되어야 함", () => {
      const result = parseTJArtist("임영웅(Piano by 조영수)");
      expect(result).toEqual({
        artist: ["임영웅"],
        feature: ["조영수"],
        producer: [],
      });
    });

    it("Piano by. 도 피처링처럼 처리되어야 함", () => {
      const result = parseTJArtist("이준영(Piano by.박보검)");
      expect(result).toEqual({
        artist: ["이준영"],
        feature: ["박보검"],
        producer: [],
      });
    });

    it("Art. 도 피처링처럼 처리되어야 함", () => {
      const result = parseTJArtist("Anonymous Artists(어나니머스아티스트)(Art.이민석)");
      expect(result).toEqual({
        artist: ["Anonymous Artists(어나니머스아티스트)"],
        feature: ["이민석"],
        producer: [],
      });
    });

    it("Song by 도 피처링처럼 처리되어야 함", () => {
      const result = parseTJArtist("god(Song by IU,헨리,조현아,양다일)");
      expect(result).toEqual({
        artist: ["god"],
        feature: ["IU", "헨리", "조현아", "양다일"],
        producer: [],
      });
    });

    it("공백 없는 by 문자열은 아티스트명에 포함되어야 함", () => {
      const result = parseTJArtist("by진성");
      expect(result).toEqual({
        artist: ["by진성"],
        feature: [],
        producer: [],
      });
    });

    it("Guitar by 도 피처링처럼 처리되어야 함", () => {
      const result = parseTJArtist("원우(세븐틴)(Guitar by 박주원)");
      expect(result).toEqual({
        artist: ["원우(세븐틴)"],
        feature: ["박주원"],
        producer: [],
      });
    });

    it("괄호 밖 Guitar by 도 피처링으로 처리되어야 함", () => {
      const result = parseTJArtist("임영웅 Guitar by 함춘호");
      expect(result).toEqual({
        artist: ["임영웅"],
        feature: ["함춘호"],
        producer: [],
      });
    });

    it("loves 키워드도 피처링으로 처리되어야 함", () => {
      const result = parseTJArtist("m-flo loves YOSHIKA");
      expect(result).toEqual({
        artist: ["m-flo"],
        feature: ["YOSHIKA"],
        producer: [],
      });
    });
  });

  describe("프로듀서 (Prod.) 처리", () => {
    it("단일 프로듀서를 추출해야 함", () => {
      const result = parseTJArtist("백아연(Prod.윤현상)");
      expect(result).toEqual({
        artist: ["백아연"],
        feature: [],
        producer: ["윤현상"],
      });
    });

    it("프로듀서 안에 여러 명이 있으면 모두 추출해야 함", () => {
      const result = parseTJArtist("아티스트(Prod.프로듀서1,프로듀서2)");
      expect(result).toEqual({
        artist: ["아티스트"],
        feature: [],
        producer: ["프로듀서1", "프로듀서2"],
      });
    });

    it("Prod. By 패턴에서도 프로듀서를 추출해야 함", () => {
      const result = parseTJArtist("윤하(Prod. By 이찬혁(AKMU(악뮤)))");
      expect(result).toEqual({
        artist: ["윤하"],
        feature: [],
        producer: ["이찬혁(AKMU(악뮤))"],
      });
    });
  });

  describe("복합 케이스 (피처링 + 프로듀서)", () => {
    it("피처링과 프로듀서가 모두 있는 경우 정상적으로 파싱되어야 함", () => {
      const result = parseTJArtist(
        "TimeFeveR(타임피버)(Feat.스카이민혁)(Prod.HOWOW)",
      );
      expect(result).toEqual({
        artist: ["TimeFeveR(타임피버)"],
        feature: ["스카이민혁"],
        producer: ["HOWOW"],
      });
    });

    it("피처링과 프로듀서가 각각 여러 명인 경우 모두 추출되어야 함", () => {
      const result = parseTJArtist(
        "아티스트(Feat.피처링1,피처링2)(Prod.프로듀서1,프로듀서2)",
      );
      expect(result).toEqual({
        artist: ["아티스트"],
        feature: ["피처링1", "피처링2"],
        producer: ["프로듀서1", "프로듀서2"],
      });
    });

    it("여러 아티스트 중 일부만 피처링/프로듀서가 있는 경우", () => {
      const result = parseTJArtist("아티스트1,아티스트2(Feat.피처링1)");
      expect(result).toEqual({
        artist: ["아티스트1", "아티스트2"],
        feature: ["피처링1"],
        producer: [],
      });
    });
  });

  describe("대소문자 구분 없이 Feat./Prod. 인식", () => {
    it("소문자 feat.도 인식해야 함", () => {
      const result = parseTJArtist("아티스트(feat.피처링)");
      expect(result).toEqual({
        artist: ["아티스트"],
        feature: ["피처링"],
        producer: [],
      });
    });

    it("소문자 prod.도 인식해야 함", () => {
      const result = parseTJArtist("아티스트(prod.프로듀서)");
      expect(result).toEqual({
        artist: ["아티스트"],
        feature: [],
        producer: ["프로듀서"],
      });
    });

    it("대문자 FEAT./PROD.도 인식해야 함", () => {
      const result = parseTJArtist("아티스트(FEAT.피처링)(PROD.프로듀서)");
      expect(result).toEqual({
        artist: ["아티스트"],
        feature: ["피처링"],
        producer: ["프로듀서"],
      });
    });
  });

  describe("추가 구분자 및 접미사 처리", () => {
    it("외 다수 접미사는 제거되어야 함", () => {
      const result = parseTJArtist("G-DRAGON 외 다수");
      expect(result).toEqual({
        artist: ["G-DRAGON"],
        feature: [],
        producer: [],
      });
    });

    it("× 기호도 아티스트 구분자로 인식되어야 함", () => {
      const result = parseTJArtist("w-inds.×G-DRAGON(BIG BANG)");
      expect(result).toEqual({
        artist: ["w-inds.", "G-DRAGON(BIG BANG)"],
        feature: [],
        producer: [],
      });
    });

    it("전각 ＆ 기호도 아티스트 구분자로 인식되어야 함", () => {
      const result = parseTJArtist("EXILE＆倖田來未");
      expect(result).toEqual({
        artist: ["EXILE", "倖田來未"],
        feature: [],
        producer: [],
      });
    });

    it("괄호 밖에 있는 with도 아티스트 구분자로 인식되어야 함", () => {
      const result = parseTJArtist("安室奈美恵 with スーパーモンキーズ");
      expect(result).toEqual({
        artist: ["安室奈美恵", "スーパーモンキーズ"],
        feature: [],
        producer: [],
      });
    });

    it("CHiCO with HoneyWorks는 하나의 가수로 처리되어야 함", () => {
      const result = parseTJArtist("CHiCO with HoneyWorks");
      expect(result).toEqual({
        artist: ["CHiCO with HoneyWorks"],
        feature: [],
        producer: [],
      });
    });

    it("with 이후 meets 가 이어져도 모든 아티스트가 분리되어야 함", () => {
      const result = parseTJArtist("CHiCO with HoneyWorks meets 中川翔子");
      expect(result).toEqual({
        artist: ["CHiCO with HoneyWorks", "中川翔子"],
        feature: [],
        producer: [],
      });
    });

    it("from 접미사는 제거되어야 함", () => {
      const result = parseTJArtist("AIR MAIL from NAGASAKI");
      expect(result).toEqual({
        artist: ["AIR MAIL"],
        feature: [],
        producer: [],
      });
    });

    it("특정 하이픈 케이스는 아티스트명만 유지해야 함", () => {
      const result = parseTJArtist("M.N.J-강인한");
      expect(result).toEqual({
        artist: ["M.N.J"],
        feature: [],
        producer: [],
      });
    });

    it("슬래시로 구분된 아티스트는 분리되어야 함", () => {
      const result = parseTJArtist("Pops Fernandez/ Janno Gibbs");
      expect(result).toEqual({
        artist: ["Pops Fernandez", "Janno Gibbs"],
        feature: [],
        producer: [],
      });
    });

    it("K/DA는 슬래시가 있어도 하나의 아티스트로 처리되어야 함", () => {
      const result = parseTJArtist("K/DA,(여자)아이들,Madison Beer,Jaira Burns");
      expect(result).toEqual({
        artist: ["K/DA", "(여자)아이들", "Madison Beer", "Jaira Burns"],
        feature: [],
        producer: [],
      });
    });

    it("K/DA가 중간에 있어도 하나의 아티스트로 처리되어야 함", () => {
      const result = parseTJArtist("(여자)아이들,Madison Beer,Lexie Liu,Jaira Burns,Seraphine,K/DA,League of Legends");
      expect(result).toEqual({
        artist: ["(여자)아이들", "Madison Beer", "Lexie Liu", "Jaira Burns", "Seraphine", "K/DA", "League of Legends"],
        feature: [],
        producer: [],
      });
    });
  });

  describe("공백 처리", () => {
    it("쉼표 주변의 공백은 제거되어야 함", () => {
      const result = parseTJArtist("아티스트1 , 아티스트2 , 아티스트3");
      expect(result).toEqual({
        artist: ["아티스트1", "아티스트2", "아티스트3"],
        feature: [],
        producer: [],
      });
    });

    it("괄호 안의 공백도 처리되어야 함", () => {
      const result = parseTJArtist("아티스트(Feat. 피처링1 , 피처링2 )");
      expect(result).toEqual({
        artist: ["아티스트"],
        feature: ["피처링1", "피처링2"],
        producer: [],
      });
    });
  });

  describe("엣지 케이스", () => {
    it("쉼표만 있는 경우 빈 배열을 반환해야 함", () => {
      const result = parseTJArtist(",,,");
      expect(result).toEqual({
        artist: [],
        feature: [],
        producer: [],
      });
    });

    it("빈 괄호도 아티스트명에 포함되어야 함", () => {
      const result = parseTJArtist("아티스트()");
      expect(result).toEqual({
        artist: ["아티스트()"],
        feature: [],
        producer: [],
      });
    });

    it("여러 개의 피처링/프로듀서 괄호가 있는 경우 모두 추출되어야 함", () => {
      const result = parseTJArtist(
        "아티스트(Feat.피처링1)(Feat.피처링2)(Prod.프로듀서1)(Prod.프로듀서2)",
      );
      expect(result).toEqual({
        artist: ["아티스트"],
        feature: ["피처링1", "피처링2"],
        producer: ["프로듀서1", "프로듀서2"],
      });
    });

    it("피처링 안에 괄호가 있는 경우 정상적으로 파싱되어야 함", () => {
      const result = parseTJArtist(
        "Miiro(미로),HoYoFair(Feat.Marochi(마로치))",
      );
      expect(result).toEqual({
        artist: ["Miiro(미로)", "HoYoFair"],
        feature: ["Marochi(마로치)"],
        producer: [],
      });
    });

    it('"외 X명" 패턴은 제거되어야 함', () => {
      const result = parseTJArtist("손태진,정진운,전태풍 외 6명");
      expect(result).toEqual({
        artist: ["손태진", "정진운", "전태풍"],
        feature: [],
        producer: [],
      });
    });

    it("피처링에 쉼표로 구분된 여러 명 (실제 예시)", () => {
      const result = parseTJArtist("Cillian(Feat.Hamel,박현진)");
      expect(result).toEqual({
        artist: ["Cillian"],
        feature: ["Hamel", "박현진"],
        producer: [],
      });
    });

    it("여러 아티스트 중 일부만 피처링 (실제 예시)", () => {
      const result = parseTJArtist("유민,RAZYBOYOCEAN(Feat.ASH ISLAND)");
      expect(result).toEqual({
        artist: ["유민", "RAZYBOYOCEAN"],
        feature: ["ASH ISLAND"],
        producer: [],
      });
    });

    it("특수문자($)가 포함된 아티스트명", () => {
      const result = parseTJArtist("Ty Dolla $ign(Feat.Quavo,Juicy J)");
      expect(result).toEqual({
        artist: ["Ty Dolla $ign"],
        feature: ["Quavo", "Juicy J"],
        producer: [],
      });
    });

    it('피처링에 "of" 패턴이 포함된 경우', () => {
      const result = parseTJArtist("도영(DOYOUNG)(Feat.벨 of KISS OF LIFE)");
      expect(result).toEqual({
        artist: ["도영(DOYOUNG)"],
        feature: ["벨 of KISS OF LIFE"],
        producer: [],
      });
    });
  });

  describe("추가 예외 케이스", () => {
    it("& 기호로 구분된 아티스트는 분리", () => {
      const result = parseTJArtist("Jed & 임창정");
      expect(result).toEqual({
        artist: ["Jed", "임창정"],
        feature: [],
        producer: [],
      });
    });

    it("Featuring 키워드를 Feat.처럼 처리하고 & 기호로 분리", () => {
      const result = parseTJArtist(
        "Jim Brickman (Featuring Ollin Raye & Susan Ashton)",
      );
      expect(result).toEqual({
        artist: ["Jim Brickman"],
        feature: ["Ollin Raye", "Susan Ashton"],
        producer: [],
      });
    });

    it("meets 키워드가 있는 복합 아티스트명", () => {
      const result = parseTJArtist("HoneyWorks meets CHiCO & sana");
      expect(result).toEqual({
        artist: ["HoneyWorks", "CHiCO", "sana"],
        feature: [],
        producer: [],
      });
    });

    it("produced by 키워드를 Prod.처럼 처리하고 & 기호로 분리", () => {
      const result = parseTJArtist(
        "milet & Aimer & 幾田りら(produced by Vaundy)",
      );
      expect(result).toEqual({
        artist: ["milet", "Aimer", "幾田りら"],
        feature: [],
        producer: ["Vaundy"],
      });
    });

    it("Prod & Feat. 복합 케이스 - & 기호로 분리", () => {
      const result = parseTJArtist("싸이(Prod & Feat. SUGA of BTS)");
      expect(result).toEqual({
        artist: ["싸이"],
        feature: ["SUGA of BTS"],
        producer: ["SUGA of BTS"],
      });
    });

    it("With 키워드 제거 - & 기호로 분리", () => {
      const result = parseTJArtist("양정승(With KCM & 노누)");
      expect(result).toEqual({
        artist: ["양정승"],
        feature: ["KCM", "노누"],
        producer: [],
      });
    });

    it("With 키워드 제거 - 단일 아티스트", () => {
      const result = parseTJArtist("KCM(With 나비)");
      expect(result).toEqual({
        artist: ["KCM"],
        feature: ["나비"],
        producer: [],
      });
    });

    it("With 키워드 제거 - 그룹명", () => {
      const result = parseTJArtist("김장훈(With 알리)");
      expect(result).toEqual({
        artist: ["김장훈"],
        feature: ["알리"],
        producer: [],
      });
    });

    it("& 기호가 붙어있는 복합 아티스트명도 분리", () => {
      const result = parseTJArtist("SG워너비&KCM");
      expect(result).toEqual({
        artist: ["SG워너비", "KCM"],
        feature: [],
        producer: [],
      });
    });

    it("괄호 안 멤버명 제거 - & 기호 포함", () => {
      const result = parseTJArtist("2AM(조권&창민)");
      expect(result).toEqual({
        artist: ["2AM"],
        feature: [],
        producer: [],
      });
    });

    it("괄호 안 멤버명 제거 - 두 번째 괄호", () => {
      const result = parseTJArtist("iKON(아이콘)(B.I & 바비)");
      expect(result).toEqual({
        artist: ["iKON(아이콘)"],
        feature: [],
        producer: [],
      });
    });

    it("괄호 안 멤버명 제거 - 뉴이스트", () => {
      const result = parseTJArtist("뉴이스트(민현&JR)");
      expect(result).toEqual({
        artist: ["뉴이스트"],
        feature: [],
        producer: [],
      });
    });

    it("괄호 안 Solo/멤버명 제거", () => {
      const result = parseTJArtist("뉴이스트 W(렌 Solo)");
      expect(result).toEqual({
        artist: ["뉴이스트 W"],
        feature: [],
        producer: [],
      });
    });

    it("& 기호로 구분된 복합 아티스트명 - 괄호 포함", () => {
      const result = parseTJArtist("MC THE MAX(이수)&럼블피쉬(최진이)");
      expect(result).toEqual({
        artist: ["MC THE MAX(이수)", "럼블피쉬(최진이)"],
        feature: [],
        producer: [],
      });
    });

    it("괄호 안 멤버명 제거 - 빅뱅 케이스 1", () => {
      const result = parseTJArtist("빅뱅(GD & T.O.P)");
      expect(result).toEqual({
        artist: ["빅뱅"],
        feature: [],
        producer: [],
      });
    });

    it("괄호 안 멤버명 제거 - 빅뱅 케이스 2", () => {
      const result = parseTJArtist("빅뱅(T.O.P Solo)");
      expect(result).toEqual({
        artist: ["빅뱅"],
        feature: [],
        producer: [],
      });
    });
  });
});
